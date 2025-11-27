const fs = require("fs").promises;
const path = require("path");
const chalk = require("chalk");
const { readIndex, ensureMyGit } = require("../utils/files");
const { createTreeObject } = require("../utils/tree");
const {
  getParentCommit,
  createCommitObject,
  updateRefs,
} = require("../utils/commit.objects");

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

    if (!message) {
      console.log(chalk.red("Please provide a commit message."));
      console.log(chalk.gray("Usage: mygit commit -m <message>"));
      return;
    }

    const treeHash = await createTreeObject(index, repoPath);

    console.log(chalk.green(`✓ Tree created: ${treeHash}`));

    const parentHash = await getParentCommit(repoPath);

    const commitHash = await createCommitObject({
      treeHash,
      parentHash,
      message,
      repoPath,
    });

    await updateRefs(repoPath, commitHash);

    console.log(chalk.green.bold(`\n Commit created: ${commitHash}`));
    console.log(chalk.gray(`  ${Object.keys(index).length} file(s) committed`));
  } catch (error) {
    console.error(chalk.red("Error in commit command:", error.message));
  }
}

module.exports = { commit };
