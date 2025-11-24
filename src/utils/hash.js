const crypto = require("crypto");
const fs = require("fs").promises;
const path = require("path");


function sha1(data) {
  return crypto.createHash("sha1").update(data).digest("hex");
}

async function writeObject(repoPath , hash , data) {

    const objectPath = path.join(repoPath , "objects");
    const objectFile = path.join(objectPath , hash);

    try{
        await fs.access(objectFile);
    } catch {
        await fs.writeFile(objectFile , data);
    }
}

module.exports = { sha1 , writeObject };