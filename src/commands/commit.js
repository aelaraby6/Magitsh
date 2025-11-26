const fs = require("fs").promises;
const path = require("path");
const chalk = require("chalk");
const { readIndex, ensureMyGit } = require("../utils/files");
const { createTreeObject } = require("../utils/tree");

async function commit(message) {
  try {
    const repoPath = await ensureMyGit();

    const index = await readIndex(repoPath);

    if (Object.keys(index).length === 0) {
      console.log(
        chalk.yellow("Nothing to commit. Stage files first with 'add'.")
      );
      return;
    }

    // if (!message) {
    //   console.log(chalk.red("Please provide a commit message."));
    //   console.log(chalk.gray("Usage: mygit commit -m <message>"));
    //   return;
    // }

    const treeHash = await createTreeObject(index, repoPath);
  } catch (error) {
    console.error(chalk.red("Error in add command:", error.message));
  }
}

async function main() {
  await commit();
}

main();

module.exports = { commit };
