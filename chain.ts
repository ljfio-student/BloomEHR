import { Block } from "./block";
import CryptoJS from "crypto-js";
import PouchDB from "pouchdb";
import PouchFind from 'pouchdb-find';
import { PeerServer } from "./peer";
import { WebServer } from "./web";

var getGenesisBlock = () => {
    return new Block(0, "0", 1521318738, "genesis", "d6f72da4a5a7ced639202617a7d297feae648447ad2db061ac6bf5c6cdf4f1bc");
};

export class BlockChain {
    private db: PouchDB.Database<Block>;
    public peer: PeerServer;
    public web: WebServer;

    constructor() {
        PouchDB.plugin(PouchFind);

        this.db = new PouchDB("data");
    }

    generateNextBlock = async (blockData) => {
        var previousBlock = await this.getLatestBlock();
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

    async getLatestBlock() {
        var result = await this.db.find({
            selector: {
                index: { $exists: true }
            },
            sort: ['index'],
            limit: 1
        });

        return result.docs.length > 0 ? result.docs[0] : null;
    }

    addBlock = async (newBlock: Block) => {
        if (this.isValidNewBlock(newBlock, this.getLatestBlock())) {
            await this.db.put(newBlock);
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

    replaceChain = async (newBlocks) => {
        let result = await this.db.find({ selector: { index: { $exists: true } }, sort: ['index'], limit: 1 });

        let blockLength = result.docs.length > 0 ? result.docs[0].index : 0;

        if (this.isValidChain(newBlocks) && newBlocks.length > blockLength) {
            console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');

            this.peer.broadcast(this.peer.responseLatestMsg());
        } else {
            console.log('Received blockchain invalid');
        }
    };

    async getBlocks() {
        return await this.db.allDocs();
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