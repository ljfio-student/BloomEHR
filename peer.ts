import * as WebSocket from "ws";
import { BlockChain } from "./chain";

enum MessageType {
    QUERY_LATEST,
    QUERY_ALL,
    RESPONSE_BLOCKCHAIN
};

export class PeerServer {
    private chain: BlockChain;
    private port: number;
    private server: WebSocket.Server;

    public sockets: Array<any>;
    private peers: Array<any>;

    constructor(chain: BlockChain, p2p_port: number) {
        this.chain = chain;
        chain.peer = this;

        this.port = p2p_port;
        this.server = new WebSocket.Server({ port: p2p_port });

        this.sockets = [];
        this.peers = [];
    }

    init() {
        this.server.on('connection', ws => this.initConnection(ws));
        console.log('listening websocket p2p port on: ' + this.port);
    }

    connectToPeers(peers) {
        peers.forEach((peer) => {
            var ws = new WebSocket(peer);

            ws.on('open', () => this.initConnection(ws));
            ws.on('error', () => {
                console.log('connection failed')
            });
        });
    }

    initConnection(ws) {
        this.sockets.push(ws);
        this.initMessageHandler(ws);
        this.initErrorHandler(ws);
        this.write(ws, this.queryChainLengthMsg());
    }

    initMessageHandler = (ws) => {
        ws.on('message', (data) => {
            var message = JSON.parse(data);

            console.log('Received message' + JSON.stringify(message));

            switch (message.type) {
                case MessageType.QUERY_LATEST:
                    this.write(ws, this.responseLatestMsg());
                    break;
                case MessageType.QUERY_ALL:
                    this.write(ws, this.responseChainMsg());
                    break;
                case MessageType.RESPONSE_BLOCKCHAIN:
                    this.handleBlockchainResponse(message);
                    break;
            }
        });
    };

    write = (ws, message) => ws.send(JSON.stringify(message));
    broadcast = (message) => this.sockets.forEach(socket => this.write(socket, message));

    initErrorHandler = (ws) => {
        var closeConnection = (ws) => {
            console.log('connection failed to peer: ' + ws.url);
            this.sockets.splice(this.sockets.indexOf(ws), 1);
        };

        ws.on('close', () => closeConnection(ws));
        ws.on('error', () => closeConnection(ws));
    };

    handleBlockchainResponse = async (message) => {
        var receivedBlocks = JSON.parse(message.data).sort((b1, b2) => (b1.index - b2.index));
        var latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
        var latestBlockHeld = await this.chain.getLatestBlock();

        if (latestBlockReceived.index > latestBlockHeld.index) {
            console.log('blockchain possibly behind. We got: ' + latestBlockHeld.index + ' Peer got: ' + latestBlockReceived.index);
            if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
                console.log("We can append the received block to our chain");
                this.chain.addBlock(latestBlockReceived); // TODO: FIX
                this.broadcast(this.responseLatestMsg());
            } else if (receivedBlocks.length === 1) {
                console.log("We have to query the chain from our peer");
                this.broadcast(this.queryAllMsg());
            } else {
                console.log("Received blockchain is longer than current blockchain");
                this.chain.replaceChain(receivedBlocks);
            }
        } else {
            console.log('received blockchain is not longer than current blockchain. Do nothing');
        }
    };



    queryChainLengthMsg = () => ({ 'type': MessageType.QUERY_LATEST });

    queryAllMsg = () => ({ 'type': MessageType.QUERY_ALL });

    responseChainMsg = () => ({
        'type': MessageType.RESPONSE_BLOCKCHAIN, 'data': JSON.stringify(this.chain.getBlocks())
    });

    responseLatestMsg = () => ({
        'type': MessageType.RESPONSE_BLOCKCHAIN,
        'data': JSON.stringify([this.chain.getLatestBlock()])
    });
}