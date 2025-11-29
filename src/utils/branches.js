const fs = require("fs").promises;
const path = require("path");
const chalk = require("chalk");

async function getCurrentBranch(repoPath) {
  const headPath = path.join(repoPath, "HEAD");

  try {
    const headContent = await fs.readFile(headPath, "utf8");
    const trimmedContent = headContent.trim();

    // HEAD format: "ref: refs/heads/main"
    if (trimmedContent.startsWith("ref:")) {
      return trimmedContent.split("/").pop().trim();
    }
    // Detached HEAD state
    return null;
  } catch {
    return null;
  }
}

async function listBranches(repoPath) {
  const currentBranch = await getCurrentBranch(repoPath);
  const branchesDir = path.join(repoPath, "refs", "heads");

  try {
    await fs.access(branchesDir);
  } catch {
    console.log("No branches yet");
    return;
  }

  const branches = await fs.readdir(branchesDir);

  if (branches.length === 0) {
    console.log("No branches yet");
    return;
  }

  branches.sort();

  branches.forEach((branch) => {
    if (branch === currentBranch) {
      console.log(chalk.green(`* ${branch}`)); // Current branch in green with asterisk
    } else {
      console.log(`  ${branch}`);
    }
  });
}

async function branchExists(repoPath, branchName) {
  const branchPath = path.join(repoPath, "refs", "heads", branchName);
  try {
    await fs.access(branchPath);
    return true;
  } catch {
    return false;
  }
}

async function getCurrentCommit(repoPath) {
  const headPath = path.join(repoPath, "HEAD");
  const headContent = await fs.readFile(headPath, "utf8");
  const trimmedContent = headContent.trim();

  if (trimmedContent.startsWith("ref:")) {
    const refPath = trimmedContent.substring(5).trim();
    const refFullPath = path.join(repoPath, refPath);

    try {
      const commitHash = await fs.readFile(refFullPath, "utf8");
      return commitHash.trim();
    } catch {
      throw new Error("fatal: Not a valid object name: HEAD");
    }
  }

  return trimmedContent;
}

function isValidBranchName(name) {
  if (!name || name.length === 0) return false;
  if (name.startsWith("-")) return false;
  if (name.startsWith(".") || name.endsWith(".")) return false;
  if (name.includes("..")) return false;
  if (name.includes(" ")) return false;
  if (/[~^:?*\[\]\\]/.test(name)) return false;
  if (name.endsWith(".lock")) return false;

  return true;
}

async function createBranch(repoPath, branchName) {
  if (!isValidBranchName(branchName)) {
    throw new Error(`'${branchName}' is not a valid branch name`);
  }

  const exists = await branchExists(repoPath, branchName);
  if (exists) {
    throw new Error(`A branch named '${branchName}' already exists`);
  }

  const commitHash = await getCurrentCommit(repoPath);
  const branchPath = path.join(repoPath, "refs", "heads", branchName);

  // Create refs/heads directory if needed
  const refsHeadsDir = path.join(repoPath, "refs", "heads");
  await fs.mkdir(refsHeadsDir, { recursive: true });

  await fs.writeFile(branchPath, commitHash + "\n");
}

async function switchBranch(repoPath, branchName) {
  const exists = await branchExists(repoPath, branchName);
  if (!exists) {
    throw new Error(
      `pathspec '${branchName}' did not match any file(s) known to mygit`
    );
  }

  const currentBranch = await getCurrentBranch(repoPath);
  if (currentBranch === branchName) {
    console.log(chalk.yellow(`Already on '${branchName}'`));
    return;
  }

  // Update HEAD to point to new branch
  const headPath = path.join(repoPath, "HEAD");
  await fs.writeFile(headPath, `ref: refs/heads/${branchName}\n`);

  console.log(chalk.green(`Switched to branch '${branchName}'`));
}

module.exports = {
  listBranches,
  createBranch,
  switchBranch,
};
