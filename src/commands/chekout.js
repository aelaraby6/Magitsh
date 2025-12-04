const fs = require("fs").promises;
const path = require("path");
const chalk = require("chalk");
const { ensureMagitsh } = require("../utils/files");
const { createBranch, switchBranch } = require("../utils/branches");

async function checkout(options) {
  try {
    const repoPath = await ensureMagitsh();
    const { createNew, branchName } = options;

    if (!branchName) {
      throw new Error("Please specify a branch name");
    }

    if (createNew) {
      // checkout -b: create and switch
      await createBranch(repoPath, branchName);

      // Update HEAD to point to new branch
      const headPath = path.join(repoPath, "HEAD");
      await fs.writeFile(headPath, `ref: refs/heads/${branchName}\n`);

      console.log(chalk.green(`Switched to a new branch '${branchName}'`));
    } else {
      // checkout: just switch
      await switchBranch(repoPath, branchName);
    }
  } catch (err) {
    console.error(chalk.red("error:"), err.message);
    process.exit(1);
  }
}
module.exports = {
  checkout,
};
