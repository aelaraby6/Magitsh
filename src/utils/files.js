// this files suppose to hadle reading , updating and writing files related operations
const fs = require("fs").promises;
const path = require("path");


async function ensureMagitsh(){
    const repoPath = path.join(process.cwd() , ".magitsh");
    try{
        await fs.access(repoPath);
    } catch{
        throw new Error("Not a Magitsh repository (or any of the parent directories): .magitsh");
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

module.exports = { ensureMagitsh , readIndex , writeIndex };