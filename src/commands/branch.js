const chalk = require("chalk");
const { ensureMagitsh } = require("../utils/files");
const { listBranches } = require("../utils/branches");

async function branch(args) {
  try {
    const repoPath = await ensureMagitsh();
    await listBranches(repoPath);
  } catch (err) {
    console.error(chalk.red("error:"), err.message);
    process.exit(1);
  }
}

module.exports = { branch };
