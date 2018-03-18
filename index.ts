import { BlockChain } from "./chain";
import { PeerServer } from "./peer";
import { WebServer}  from "./web";

var http_port = Number(process.env.HTTP_PORT) || 3001;
var p2p_port = Number(process.env.P2P_PORT) || 6001;
var initial_peers = process.env.PEERS ? process.env.PEERS.split(',') : [];

// Initialise our blockchain
const chain = new BlockChain();
chain.init().then(() => {
    // Setup peer-to-peer service
    const peer = new PeerServer(chain, p2p_port);
    peer.connectToPeers(initial_peers);
    peer.init();

    // Web service
    const web = new WebServer(chain, peer, http_port);
    web.listen();
});