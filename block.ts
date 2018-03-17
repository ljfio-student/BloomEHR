export class Block {
    public index: number;
    public previousHash: string;
    public timestamp: number;
    public data: any;
    public hash: string;

    constructor(index, previousHash, timestamp, data, hash) {
        this.index = index;
        this.previousHash = previousHash.toString();
        this.timestamp = timestamp;
        this.data = data;
        this.hash = hash.toString();
    }
}