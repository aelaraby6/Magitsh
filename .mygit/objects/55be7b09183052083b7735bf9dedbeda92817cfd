const fs = require("fs").promises;
const path = require("path");
const zlib = require("zlib");
const { sha1 } = require("./hash");

async function createTreeObject(index, repoPath) {
  const organizedFiles = organizeFilesByDirectory(index);

  const rootTreeHash = await buildTreeObjects(organizedFiles, repoPath);

  console.log(rootTreeHash);
  

}

function organizeFilesByDirectory(index) {
  let result = {};
  Object.entries(index).forEach(([file, info]) => {
    let paths = file.split("/");
    let fileName = paths.pop();
    let dirPath = paths.length > 0 ? paths.join("/") : "root";

    if (!result[dirPath]) {
      result[dirPath] = [];
    }

    result[dirPath].push({
      mode: "100644", // regular file
      name: fileName,
      hash: info.hash,
      type: "blob",
    });
  });

  return result;
}

async function buildTreeObjects(organized, repoPath) {
  const treeHashes = {};

  const sortedDirs = Object.keys(organized).sort((a, b) => {
    if (a === "root") return 1;
    if (b === "root") return -1;
    return b.split("/").length - a.split("/").length;
  });

  for (const dirPath of sortedDirs) {
    const entries = [...organized[dirPath]];

    if (dirPath === "root") {
      const directSubdirs = Object.keys(organized).filter(
        (d) => d !== "root" && !d.includes("/")
      );

      for (const subdir of directSubdirs) {
        entries.push({
          mode: "040000", // directory mode
          name: subdir,
          hash: treeHashes[subdir],
          type: "tree",
        });
      }
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));

    const treeHash = await saveTreeObject(entries, repoPath);

    const key = dirPath === "root" ? "root" : dirPath.split("/").pop();
    treeHashes[key] = treeHash;
  }

  console.log(treeHashes);
  
  
  return treeHashes["root"];
}

async function saveTreeObject(entries, repoPath) {
  let contentBuffers = [];
  
  for (const entry of entries) {
    // [mode] [space] [name] [null byte]
    const header = Buffer.from(`${entry.mode} ${entry.name}\0`);
    
    // [20-byte binary hash]
    const hashBinary = Buffer.from(entry.hash, 'hex');
    
    contentBuffers.push(header);
    contentBuffers.push(hashBinary);
  }
  
  const content = Buffer.concat(contentBuffers);
  
  const header = Buffer.from(`tree ${content.length}\0`);
  const fullContent = Buffer.concat([header, content]);
  
  const hash = sha1(fullContent);
  
  const dir = path.join(repoPath, 'objects', hash.substring(0, 2));
  const file = path.join(dir, hash.substring(2));
  
  await fs.mkdir(dir, { recursive: true });
  
  const compressed = zlib.deflateSync(fullContent);
  await fs.writeFile(file, compressed);
    
  return hash;
}



module.exports = { createTreeObject };
