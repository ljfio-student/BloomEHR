import { BlockChain } from "./chain";
import * as express from "express";
import * as bodyParser from 'body-parser';
import { PeerServer } from "./peer";

export class WebServer {
    private port: number;
    private app;

    constructor(chain: BlockChain, peer: PeerServer, http_port: number) {
        this.port = http_port;
        chain.web = this;

        this.app = express();

        this.app.use(bodyParser.json());

        this.app.get('/blocks', async (req, res) => res.send(JSON.stringify(await chain.getBlocks())));

        this.app.post('/mineBlock', async (req, res) => {
            var newBlock = await chain.generateNextBlock(req.body.data);
            await chain.addBlock(newBlock);
            peer.broadcast(await peer.responseLatestMsg());
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