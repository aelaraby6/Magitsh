const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");
const chalk = require("chalk");

async function readCommitObject(hash, repoPath) {
  try {
    const dir = hash.substring(0, 2);
    const file = hash.substring(2);
    const objectPath = path.join(repoPath, "objects", dir, file);

    const compressed = await fs.readFile(objectPath);
    const decompressed = zlib.inflateSync(compressed);
    const content = decompressed.toString();

    return parseCommit(content);
  } catch (error) {
    return null;
  }
}

function parseCommit(content) {
  // commit [size]\0tree [hash]\nparent [hash]\nauthor ...\ncommitter ...\n\n[message]

  const nullIndex = content.indexOf("\0");
  const body = content.substring(nullIndex + 1);

  const lines = body.split("\n");
  const commit = {
    tree: null,
    parent: null,
    author: null,
    authorDate: null,
    committer: null,
    committerDate: null,
    message: "",
  };

  let messageStarted = false;
  const messageLines = [];

  for (const line of lines) {
    if (messageStarted) {
      messageLines.push(line);
    } else if (line.startsWith("tree ")) {
      commit.tree = line.substring(5).trim();
    } else if (line.startsWith("parent ")) {
      commit.parent = line.substring(7).trim();
    } else if (line.startsWith("author ")) {
      const authorInfo = parseAuthorLine(line.substring(7));
      commit.author = authorInfo.name;
      commit.authorDate = authorInfo.date;
    } else if (line.startsWith("committer ")) {
      const committerInfo = parseAuthorLine(line.substring(10));
      commit.committer = committerInfo.name;
      commit.committerDate = committerInfo.date;
    } else if (line === "") {
      messageStarted = true;
    }
  }

  commit.message = messageLines.join("\n").trim();

  return commit;
}

function parseAuthorLine(line) {
  // Format: Name <email> timestamp timezone
  // Example: John Doe <john@example.com> 1732723200 +0200

  const match = line.match(/^(.+) <(.+)> (\d+) ([+-]\d{4})$/);

  if (!match) {
    return { name: line, email: "", date: null };
  }

  const [, name, email, timestamp, timezone] = match;
  const date = new Date(parseInt(timestamp) * 1000);

  return {
    name: `${name} <${email}>`,
    email,
    date,
    timezone,
  };
}

function displayCommit(commit, hash) {
  console.log(chalk.yellow("commit " + hash));

  if (commit.author) {
    console.log(chalk.white("Author: " + commit.author));
  }

  if (commit.date) {
    console.log(chalk.white("Date:   " + commit.date));
  }

  console.log("");

  const messageLines = commit.message.split("\n");
  messageLines.forEach((line) => {
    console.log("    " + line);
  });

  console.log("");
}

module.exports = {
  readCommitObject,
  displayCommit,
};
