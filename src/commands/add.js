const fs = require("fs").promises;
const path = require("path");
const chalk = require("chalk");
const { ensureMyGit, readIndex, writeIndex } = require("../utils/files");
const { sha1, writeObject } = require("../utils/hash");

async function add(files) {
  try {
    const repoPath = await ensureMyGit(); 
    const objectsPath = path.join(repoPath, "objects");

    // Ensure objects folder exists
    try {
      await fs.access(objectsPath);
    } catch {
      await fs.mkdir(objectsPath);
    }

    let index = await readIndex(repoPath);
    
    for (const file of files) {
        const filePath = path.join(process.cwd(), file);


        try{
            const content = await fs.readFile(filePath);
            const hash = sha1(content);

            // store in .mygit/objects
            await writeObject(repoPath, hash, content);

            // update index
            const stat = await fs.stat(filePath);
            index[file] = {
                hash: hash,
                size: stat.size,
                mtime: stat.mtimeMs
            };

            console.log(chalk.green(`Added ${file} to staging area.`));

        } catch (error) {
            console.error(chalk.red(`Error adding file ${file}:`, error.message));
        }
    }

    await writeIndex(repoPath, index);
    
  } catch (error) {
    console.error(chalk.red("Error in add command:", error.message));
  }
}

module.exports = { add };

 