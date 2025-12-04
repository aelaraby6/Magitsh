const fs = require("fs").promises;
const path = require("path");

// Config File
async function createConfigFile(magitshPath) {
  const configContent = `[core]
	repositoryformatversion = 0
	filemode = true
	bare = false
	logallrefupdates = true
`;

  await fs.writeFile(path.join(magitshPath, "config"), configContent);
}

// Desc File
async function createDescriptionFile(magitshPath) {
  const descriptionContent =
    "Unnamed repository; edit this file 'description' to name the repository.\n";

  await fs.writeFile(path.join(magitshPath, "description"), descriptionContent);
}

// Head File
async function createHeadFile(magitshPath, defaultBranch = "main") {
  const headContent = `ref: refs/heads/${defaultBranch}\n`;

  await fs.writeFile(path.join(magitshPath, "HEAD"), headContent);
}

// Hooks Samples
async function createHooksSamples(magitshPath) {
  const hooksPath = path.join(magitshPath, "hooks");

  // pre-commit.sample
  const preCommitSample = `#!/bin/sh
# Pre-commit hook example
# Remove .sample extension to activate

echo "Running pre-commit checks..."

# Add your checks here
exit 0
`;

  await fs.writeFile(
    path.join(hooksPath, "pre-commit.sample"),
    preCommitSample
  );

  // commit-msg.sample
  const commitMsgSample = `#!/bin/sh
# Commit-msg hook example
# Remove .sample extension to activate

# Check commit message format
exit 0
`;

  await fs.writeFile(
    path.join(hooksPath, "commit-msg.sample"),
    commitMsgSample
  );
}

// Info Folder
async function createInfoExclude(magitshPath) {
  const excludeContent = `# git ls-files --others --exclude-from=.git/info/exclude
# Lines that start with '#' are comments.
# For a project mostly in C, the following would be a good set of
# exclude patterns (uncomment them if you want to use them):
# *.[oa]
# *~
`;

  await fs.writeFile(path.join(magitshPath, "info", "exclude"), excludeContent);
}

// Create Main Structure
async function createDirectoryStructure(magitshPath) {
  await fs.mkdir(magitshPath);

  // Objects
  await fs.mkdir(path.join(magitshPath, "objects"));
  await fs.mkdir(path.join(magitshPath, "objects", "info"));
  await fs.mkdir(path.join(magitshPath, "objects", "pack"));

  // Refs
  await fs.mkdir(path.join(magitshPath, "refs"));
  await fs.mkdir(path.join(magitshPath, "refs", "heads"));
  await fs.mkdir(path.join(magitshPath, "refs", "tags"));

  await fs.mkdir(path.join(magitshPath, "hooks"));

  await fs.mkdir(path.join(magitshPath, "info"));
}

module.exports = {
  createConfigFile,
  createDescriptionFile,
  createHeadFile,
  createDirectoryStructure,
  createHooksSamples,
  createInfoExclude,
};
