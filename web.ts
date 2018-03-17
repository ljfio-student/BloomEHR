import { BlockChain } from "./chain";
import * as express from "express";
import * as bodyParser from 'body-parser';
import { PeerServer } from "./peer";

export class WebServer {
    private port: number;
    private app;

    constructor(chain: BlockChain, peer: PeerServer, http_port: number) {
        this.port = http_port;

        this.app = express();

        this.app.use(bodyParser.json());

        this.app.get('/blocks', (req, res) => res.send(JSON.stringify(chain.getBlocks())));

        this.app.post('/mineBlock', (req, res) => {
            var newBlock = chain.generateNextBlock(req.body.data);
            chain.addBlock(newBlock);
            peer.broadcast(peer.responseLatestMsg());
            console.log('block added: ' + JSON.stringify(newBlock));
            res.send();
        });

        this.app.get('/peers', (req, res) => {
            res.send(peer.sockets.map(s => s._socket.remoteAddress + ':' + s._socket.remotePort));
        });

        this.app.post('/addPeer', (req, res) => {
            peer.connectToPeers([req.body.peer]);
            res.send();
        });
    }

    listen() {
        this.app.listen(this.port, () => console.log('Listening http on port: ' + this.port));
    }
}