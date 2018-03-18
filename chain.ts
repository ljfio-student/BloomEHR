import { Block } from "./block";
import CryptoJS from "crypto-js";
import * as PouchDB from "pouchdb";
import * as PouchFind from 'pouchdb-find';
import { PeerServer } from "./peer";
import { WebServer } from "./web";

PouchDB.plugin(PouchFind);

var getGenesisBlock = () => {
    return new Block(0, "0", 1521318738, "genesis", "d6f72da4a5a7ced639202617a7d297feae648447ad2db061ac6bf5c6cdf4f1bc");
};

export class BlockChain {
    public db: PouchDB.Database<Block>;
    public peer: PeerServer;
    public web: WebServer;

    constructor() {
        this.db = new PouchDB("data");
    }

    async init() {
        try {
            var result = await this.db.createIndex({
                index: {
                    name: "block-identity",
                    fields: ['identity']
                }
            });

            if (result.result == "created") {
                await this.db.post(getGenesisBlock())
            }
        } catch(err) {
            console.error(err);
        }
    }

    async generateNextBlock(blockData: Block): Promise<Block> {
        var previousBlock = await this.getLatestBlock();
        var nextIndex = previousBlock.identity + 1;
        var nextTimestamp = new Date().getTime() / 1000;
        var nextHash = this.calculateHash(nextIndex, previousBlock.hash, nextTimestamp, blockData);
        return new Block(nextIndex, previousBlock.hash, nextTimestamp, blockData, nextHash);
    };

    calculateHashForBlock = (block: Block) => {
        return this.calculateHash(block.identity, block.previousHash, block.timestamp, block.data);
    };

    calculateHash = (index, previousHash, timestamp, data) => {
        return CryptoJS.SHA256(index + previousHash + timestamp + data).toString();
    };

    async getLatestBlock(): Promise<Block> {
        try {
            var result = await this.db.find({
                selector: {
                    identity: { $gte: 0 }
                },
                sort: [{identity: 'desc'}],
                limit: 1
            });

            return result.docs[0] as Block;
        } catch(err) {
            console.error(err);
        }

        return null;
    }

    addBlock = async (newBlock: Block) => {
        if (this.isValidNewBlock(newBlock, await this.getLatestBlock())) {
            await this.db.put(newBlock);
        }
    };

    isValidNewBlock = (newBlock: Block, previousBlock: Block) => {
        if (previousBlock.identity + 1 !== newBlock.identity) {
            console.log('invalid identity');
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

    replaceChain = async (newBlocks: Array<Block>) => {
        let result = await this.db.find({
            selector: { identity: { $exists: true } },
            sort: [{identity: 'desc'}],
            limit: 1 });

        let blockLength = result.docs[0].identity;

        if (this.isValidChain(newBlocks) && newBlocks.length > blockLength) {
            console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');

            this.peer.broadcast(await this.peer.responseLatestMsg());
        } else {
            console.log('Received blockchain invalid');
        }
    };

    async getBlocks(): Promise<Array<Block>> {
        try {
            var result = await this.db.allDocs({
                include_docs: true,
            });

            return result.rows.map((val) => val.doc) as Array<Block>;
        } catch (err) {
            console.error(err);
        }

        return null;
    }

    isValidChain = (blockchainToValidate: Array<Block>) => {
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