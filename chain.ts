import { Block } from "./block";
import CryptoJS from "crypto-js";
import PouchDB from "pouchdb";
import { PeerServer } from "./peer";
import { WebServer } from "./web";

var getGenesisBlock = () => {
    return new Block(0, "0", 1521318738, "genesis", "d6f72da4a5a7ced639202617a7d297feae648447ad2db061ac6bf5c6cdf4f1bc");
};

export class BlockChain {
    private db: PouchDB.Database;
    public peer: PeerServer;
    public web: WebServer;

    constructor() {
        this.db = new PouchDB("data");

        // Set some defaults (required if your JSON file is empty)
        this.db.defaults({ chain: [getGenesisBlock()], user: {}, count: 0 }).write();
    }

    generateNextBlock = (blockData) => {
        var previousBlock = this.getLatestBlock();
        var nextIndex = previousBlock.index + 1;
        var nextTimestamp = new Date().getTime() / 1000;
        var nextHash = this.calculateHash(nextIndex, previousBlock.hash, nextTimestamp, blockData);
        return new Block(nextIndex, previousBlock.hash, nextTimestamp, blockData, nextHash);
    };

    calculateHashForBlock = (block) => {
        return this.calculateHash(block.index, block.previousHash, block.timestamp, block.data);
    };

    calculateHash = (index, previousHash, timestamp, data) => {
        return CryptoJS.SHA256(index + previousHash + timestamp + data).toString();
    };

    getLatestBlock = () => this.db.get('chain').sortBy('id').first();

    addBlock = (newBlock) => {
        if (this.isValidNewBlock(newBlock, this.getLatestBlock())) {
            this.db.get('chain')
                .push(newBlock)
                .write();
        }
    };

    isValidNewBlock = (newBlock, previousBlock) => {
        if (previousBlock.index + 1 !== newBlock.index) {
            console.log('invalid index');
            return false;
        } else if (previousBlock.hash !== newBlock.previousHash) {
            console.log('invalid previous hash');
            return false;
        } else if (this.calculateHashForBlock(newBlock) !== newBlock.hash) {
            console.log(typeof (newBlock.hash) + ' ' + typeof this.calculateHashForBlock(newBlock));
            console.log('invalid hash: ' + this.calculateHashForBlock(newBlock) + ' ' + newBlock.hash);
            return false;
        }
        return true;
    };

    replaceChain = (newBlocks) => {
        if (this.isValidChain(newBlocks) && newBlocks.length > this.db. .length) {
            console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
            this.db. = newBlocks;
            this.peer.broadcast(this.peer.responseLatestMsg());
        } else {
            console.log('Received blockchain invalid');
        }
    };

    getBlocks() {
        return this.db
    }

    isValidChain = (blockchainToValidate) => {
        if (JSON.stringify(blockchainToValidate[0]) !== JSON.stringify(getGenesisBlock())) {
            return false;
        }

        var tempBlocks = [blockchainToValidate[0]];

        for (var i = 1; i < blockchainToValidate.length; i++) {
            if (this.isValidNewBlock(blockchainToValidate[i], tempBlocks[i - 1])) {
                tempBlocks.push(blockchainToValidate[i]);
            } else {
                return false;
            }
        }

        return true;
    };
}