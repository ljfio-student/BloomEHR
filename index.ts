import { BlockChain } from "./chain";
import { PeerServer } from "./peer";
import { WebServer}  from "./web";

var http_port = Number(process.env.HTTP_PORT) || 3001;
var p2p_port = Number(process.env.P2P_PORT) || 6001;
var initial_peers = process.env.PEERS ? process.env.PEERS.split(',') : [];

const chain = new BlockChain();
const peer = new PeerServer(chain, p2p_port);
const web = new WebServer(chain, peer, http_port);

peer.connectToPeers(initial_peers);
web.listen();
peer.init();