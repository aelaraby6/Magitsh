const fs = require("fs").promises;
const path = require("path");
const zlib = require("zlib");
const chalk = require("chalk");
const { ensureMagitsh } = require("../utils/files");
const { readCommitObject, displayCommit } = require("../utils/parse");

async function log() {
  try {
    const repoPath = await ensureMagitsh();

    const headPath = path.join(repoPath, "HEAD");
    const headContent = await fs.readFile(headPath, "utf-8");

    const match = headContent.match(/ref: (.+)/);
    if (!match) {
      console.log(chalk.yellow("Detached HEAD state"));
      return;
    }

    const branchRef = match[1].trim();
    const branchPath = path.join(repoPath, branchRef);

    let currentCommitHash;
    try {
      currentCommitHash = await fs.readFile(branchPath, "utf-8");
      currentCommitHash = currentCommitHash.trim();
    } catch (error) {
      console.log(chalk.yellow("No commits yet"));
      console.log(
        chalk.gray(
          "Use 'magitsh commit -m \"message\"' to create your first commit"
        )
      );
      return;
    }

    console.log(
      chalk.bold.blue(`\nCommit history for ${branchRef.split("/").pop()}:\n`)
    );

    let commitCount = 0;
    while (currentCommitHash) {
      const commitData = await readCommitObject(currentCommitHash, repoPath);

      if (!commitData) {
        console.log(
          chalk.red(`\nError: Could not read commit ${currentCommitHash}`)
        );
        break;
      }

      displayCommit(commitData, currentCommitHash);
      commitCount++;

      currentCommitHash = commitData.parent;
    }

    console.log(chalk.gray(`\nTotal commits: ${commitCount}\n`));
  } catch (error) {
    console.error(chalk.red("Error in log command:", error.message));
  }
}

module.exports = { log };
