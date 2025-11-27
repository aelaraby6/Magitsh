const fs = require("fs").promises;
const path = require("path");

// Config File
async function createConfigFile(mygitPath) {
  const configContent = `[core]
	repositoryformatversion = 0
	filemode = true
	bare = false
	logallrefupdates = true
`;

  await fs.writeFile(path.join(mygitPath, "config"), configContent);
}

// Desc File
async function createDescriptionFile(mygitPath) {
  const descriptionContent =
    "Unnamed repository; edit this file 'description' to name the repository.\n";

  await fs.writeFile(path.join(mygitPath, "description"), descriptionContent);
}

// Head File
async function createHeadFile(mygitPath, defaultBranch = "main") {
  const headContent = `ref: refs/heads/${defaultBranch}\n`;

  await fs.writeFile(path.join(mygitPath, "HEAD"), headContent);
}

// Hooks Samples
async function createHooksSamples(mygitPath) {
  const hooksPath = path.join(mygitPath, "hooks");

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
async function createInfoExclude(mygitPath) {
  const excludeContent = `# git ls-files --others --exclude-from=.git/info/exclude
# Lines that start with '#' are comments.
# For a project mostly in C, the following would be a good set of
# exclude patterns (uncomment them if you want to use them):
# *.[oa]
# *~
`;

  await fs.writeFile(path.join(mygitPath, "info", "exclude"), excludeContent);
}

// Create Main Structure
async function createDirectoryStructure(mygitPath) {
  await fs.mkdir(mygitPath);

  // Objects
  await fs.mkdir(path.join(mygitPath, "objects"));
  await fs.mkdir(path.join(mygitPath, "objects", "info"));
  await fs.mkdir(path.join(mygitPath, "objects", "pack"));

  // Refs
  await fs.mkdir(path.join(mygitPath, "refs"));
  await fs.mkdir(path.join(mygitPath, "refs", "heads"));
  await fs.mkdir(path.join(mygitPath, "refs", "tags"));

  await fs.mkdir(path.join(mygitPath, "hooks"));

  await fs.mkdir(path.join(mygitPath, "info"));
}

module.exports = {
  createConfigFile,
  createDescriptionFile,
  createHeadFile,
  createDirectoryStructure,
  createHooksSamples,
  createInfoExclude,
};
