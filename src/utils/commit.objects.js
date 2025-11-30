const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");
const chalk = require("chalk");

async function getParentCommit(repoPath) {
  try {
    const headPath = path.join(repoPath, "HEAD");
    const headContent = await fs.readFile(headPath, "utf-8");

    const match = headContent.match(/ref: (.+)/);
    if (!match) {
      return null; // detached HEAD
    }

    const refPath = path.join(repoPath, match[1].trim());

    // reading branch ref
    try {
      const commitHash = await fs.readFile(refPath, "utf-8");
      return commitHash.trim();
    } catch (err) {
      return null;
    }
  } catch (error) {
    return null;
  }
}

async function createCommitObject({ treeHash, parentHash, message, repoPath, secondParent }) {
  const author = {
    name: "Conan",
    email: "conan@example.com",
    timestamp: Math.floor(Date.now() / 1000),
    timezone: "+0200",
  };

  let commitContent = `tree ${treeHash}\n`;

  if (parentHash) {
    commitContent += `parent ${parentHash}\n`;
  }

  // Support merge commits with two parents
  if (secondParent) {
    commitContent += `parent ${secondParent}\n`;
  }

  commitContent += `author ${author.name} <${author.email}> ${author.timestamp} ${author.timezone}\n`;
  commitContent += `committer ${author.name} <${author.email}> ${author.timestamp} ${author.timezone}\n`;
  commitContent += `\n`;
  commitContent += `${message}\n`;

  const header = `commit ${Buffer.byteLength(commitContent)}\0`;
  const fullContent = Buffer.from(header + commitContent);

  const commitHash = crypto
    .createHash("sha1")
    .update(fullContent)
    .digest("hex");

  const dir = path.join(repoPath, "objects", commitHash.substring(0, 2));
  const file = path.join(dir, commitHash.substring(2));

  await fs.mkdir(dir, { recursive: true });

  const compressed = zlib.deflateSync(fullContent);
  await fs.writeFile(file, compressed);

  return commitHash;
}

async function updateRefs(repoPath, commitHash) {
  const headPath = path.join(repoPath, "HEAD");
  const headContent = await fs.readFile(headPath, "utf-8");

  const match = headContent.match(/ref: (.+)/);
  if (!match) {
    throw new Error("Detached HEAD not supported yet");
  }

  const branchRef = match[1].trim();
  const branchPath = path.join(repoPath, branchRef);

  await fs.mkdir(path.dirname(branchPath), { recursive: true });

  await fs.writeFile(branchPath, commitHash + "\n");

  console.log(chalk.gray(`Updated ${branchRef}`));
}

module.exports = {
  getParentCommit,
  createCommitObject,
  updateRefs,
};
