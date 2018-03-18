export class Block {
    public identity: number;
    public previousHash: string;
    public timestamp: number;
    public data: any;
    public hash: string;

    constructor(identity, previousHash, timestamp, data, hash) {
        this.identity = identity;
        this.previousHash = previousHash.toString();
        this.timestamp = timestamp;
        this.data = data;
        this.hash = hash.toString();
    }
}