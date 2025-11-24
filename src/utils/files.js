// this files suppose to hadle reading , updating and writing files related operations
const fs = require("fs").promises;
const path = require("path");


async function ensureMyGit(){
    const repoPath = path.join(process.cwd() , ".mygit");
    try{
        await fs.access(repoPath);
    } catch{
        throw new Error("Not a MyGit repository (or any of the parent directories): .mygit");
    }
    return repoPath;
}

async function readIndex(repoPath){
    const indexPath = path.join(repoPath , "index.json");

    try{
        const data = await fs.readFile(indexPath , "utf-8");
        return JSON.parse(data);
    } catch {
        return {};
    }

}

async function writeIndex(repoPath , indexData){
    const indexPath = path.join(repoPath , "index.json");
    await fs.writeFile(indexPath , JSON.stringify(indexData , null , 2));
}

module.exports = { ensureMyGit , readIndex , writeIndex };