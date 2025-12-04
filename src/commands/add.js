const fs = require("fs").promises;
const path = require("path");
const chalk = require("chalk");
const { ensureMagitsh, readIndex, writeIndex } = require("../utils/files");
const { sha1, writeObject } = require("../utils/hash");
const { getWorkingFiles } = require("../utils/getWorkFiles");

async function add(files) {
  try {
    const repoPath = await ensureMagitsh();
    const objectsPath = path.join(repoPath, "objects");

    // Ensure objects folder exists
    try {
      await fs.access(objectsPath);
    } catch {
      await fs.mkdir(objectsPath);
    }

    let index = await readIndex(repoPath);

    // Expand files if '.' is provided
    let filesToAdd = files;
    if (files.includes(".")) {
      filesToAdd = await getWorkingFiles(process.cwd());
      if (filesToAdd.length === 0) {
        console.log(chalk.yellow("No files to add."));
        return;
      }
    }

    for (const file of filesToAdd) {
      const filePath = path.join(process.cwd(), file);

      try {
        // Check if file exists
        await fs.access(filePath);

        const content = await fs.readFile(filePath);
        const hash = sha1(content);

        // Check if file is already staged with the same hash
        if (index[file] && index[file].hash === hash) {
          // File already staged and unchanged, skip it
          continue;
        }

        // store in .magitsh/objects
        await writeObject(repoPath, hash, content);

        // update index
        const stat = await fs.stat(filePath);
        index[file] = {
          hash: hash,
          size: stat.size,
          mtime: stat.mtimeMs,
        };

        console.log(chalk.green(`Added ${file} to staging area.`));
      } catch (error) {
        // File doesn't exist - might be deleted, remove from index
        if (error.code === 'ENOENT' && index[file]) {
          delete index[file];
          console.log(chalk.yellow(`Removed ${file} from staging area (deleted).`));
        } else {
          console.error(chalk.red(`Error adding file ${file}:`, error.message));
        }
      }
    }

    await writeIndex(repoPath, index);
  } catch (error) {
    console.error(chalk.red("Error in add command:", error.message));
  }
}

module.exports = { add };
