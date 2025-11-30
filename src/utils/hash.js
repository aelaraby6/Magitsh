const crypto = require("crypto");
const fs = require("fs").promises;
const path = require("path");
const zlib = require("zlib");


function sha1(data) {
    return crypto.createHash("sha1").update(data).digest("hex");
}

async function writeObject(repoPath, hash, data) {
    const dir = hash.substring(0, 2);
    const file = hash.substring(2);
    const objectDir = path.join(repoPath, "objects", dir);
    const objectFile = path.join(objectDir, file);

    try {
        await fs.access(objectFile);
    } catch {
        await fs.mkdir(objectDir, { recursive: true });

        // Create blob object with header and compress
        const header = `blob ${data.length}\0`;
        const fullContent = Buffer.concat([Buffer.from(header), Buffer.from(data)]);
        const compressed = zlib.deflateSync(fullContent);

        await fs.writeFile(objectFile, compressed);
    }
}

module.exports = { sha1, writeObject };