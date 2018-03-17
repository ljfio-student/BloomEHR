export class Block {
    private index: number;
    private previousHash: string;
    private timestamp: number;
    private data: any;
    private hash: string;

    constructor(index, previousHash, timestamp, data, hash) {
        this.index = index;
        this.previousHash = previousHash.toString();
        this.timestamp = timestamp;
        this.data = data;
        this.hash = hash.toString();
    }
}