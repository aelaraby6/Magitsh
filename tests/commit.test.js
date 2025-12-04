const fs = require("fs").promises;
const path = require("path");
const zlib = require("zlib");
const { add } = require("../src/commands/add");
const { init } = require("../src/commands/init");
const { commit } = require("../src/commands/commit");

global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
};

describe("Commit Command", () => {
  const testDir = path.join(__dirname, "test-commit-repo");
  const magitshPath = path.join(testDir, ".magitsh");
  const objectsPath = path.join(magitshPath, "objects");
  const indexPath = path.join(magitshPath, "index.json");
  const headPath = path.join(magitshPath, "HEAD");
  const refsPath = path.join(magitshPath, "refs", "heads");

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    process.chdir(testDir);
    await init();
    console.log.mockClear();
    console.error.mockClear();
  });

  afterEach(async () => {
    process.chdir(__dirname);
    await fs.rm(testDir, { recursive: true, force: true });
  });

  // Helper function to read and decompress object
  async function readObject(hash) {
    const dir = hash.substring(0, 2);
    const file = hash.substring(2);
    const objectPath = path.join(objectsPath, dir, file);
    const compressed = await fs.readFile(objectPath);
    const decompressed = zlib.inflateSync(compressed);
    return decompressed.toString();
  }

  // Helper function to get current commit hash
  async function getCurrentCommitHash() {
    const headContent = await fs.readFile(headPath, "utf-8");
    const match = headContent.match(/ref: (.+)/);
    if (!match) return null;

    const branchPath = path.join(magitshPath, match[1].trim());
    try {
      const commitHash = await fs.readFile(branchPath, "utf-8");
      return commitHash.trim();
    } catch {
      return null;
    }
  }

  test("should create a commit with staged files", async () => {
    const testFile = "test.txt";
    await fs.writeFile(testFile, "Hello, World!");
    await add([testFile]);

    await commit("Initial commit");

    // Check commit was created
    const commitHash = await getCurrentCommitHash();
    expect(commitHash).toBeDefined();
    expect(commitHash.length).toBe(40); // SHA-1 hash length

    // Check success message
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Commit created:")
    );
  });

  test("should fail when no files are staged", async () => {
    await commit("Empty commit");

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Nothing to commit")
    );
  });

  test("should fail when no commit message is provided", async () => {
    const testFile = "test.txt";
    await fs.writeFile(testFile, "content");
    await add([testFile]);

    await commit("");

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Please provide a commit message")
    );
  });

  test("should create tree object from staged files", async () => {
    const testFile = "test.txt";
    await fs.writeFile(testFile, "Tree test content");
    await add([testFile]);

    await commit("Test tree creation");

    const commitHash = await getCurrentCommitHash();
    const commitContent = await readObject(commitHash);

    // Extract tree hash from commit
    const treeMatch = commitContent.match(/tree ([a-f0-9]{40})/);
    expect(treeMatch).toBeTruthy();

    const treeHash = treeMatch[1];
    expect(treeHash.length).toBe(40);

    // Verify tree object exists
    const dir = treeHash.substring(0, 2);
    const file = treeHash.substring(2);
    const treeExists = await fs
      .access(path.join(objectsPath, dir, file))
      .then(() => true)
      .catch(() => false);

    expect(treeExists).toBe(true);
  });

  test("should create commit object with correct format", async () => {
    const testFile = "format-test.txt";
    await fs.writeFile(testFile, "Format test");
    await add([testFile]);

    const message = "Test commit message";
    await commit(message);

    const commitHash = await getCurrentCommitHash();
    const commitContent = await readObject(commitHash);

    // Check commit format
    expect(commitContent).toMatch(/^commit \d+\0/);
    expect(commitContent).toMatch(/tree [a-f0-9]{40}/);
    expect(commitContent).toMatch(/author .+ <.+> \d+ [+-]\d{4}/);
    expect(commitContent).toMatch(/committer .+ <.+> \d+ [+-]\d{4}/);
    expect(commitContent).toContain(message);
  });

  test("should link to parent commit on second commit", async () => {
    // First commit
    const file1 = "file1.txt";
    await fs.writeFile(file1, "First file");
    await add([file1]);
    await commit("First commit");

    const firstCommitHash = await getCurrentCommitHash();

    // Second commit
    const file2 = "file2.txt";
    await fs.writeFile(file2, "Second file");
    await add([file2]);
    await commit("Second commit");

    const secondCommitHash = await getCurrentCommitHash();
    const secondCommitContent = await readObject(secondCommitHash);

    // Check parent reference
    expect(secondCommitContent).toContain(`parent ${firstCommitHash}`);
  });

  test("should not have parent on first commit", async () => {
    const testFile = "test.txt";
    await fs.writeFile(testFile, "First commit test");
    await add([testFile]);
    await commit("First commit");

    const commitHash = await getCurrentCommitHash();
    const commitContent = await readObject(commitHash);

    // Should not contain parent
    expect(commitContent).not.toMatch(/parent [a-f0-9]{40}/);
  });

  test("should update branch reference", async () => {
    const testFile = "test.txt";
    await fs.writeFile(testFile, "content");
    await add([testFile]);

    await commit("Update branch test");

    // Check branch file exists and contains commit hash
    const mainBranchPath = path.join(refsPath, "main");
    const branchExists = await fs
      .access(mainBranchPath)
      .then(() => true)
      .catch(() => false);

    expect(branchExists).toBe(true);

    const commitHash = await fs.readFile(mainBranchPath, "utf-8");
    expect(commitHash.trim().length).toBe(40);
  });

  test("should commit multiple files in one commit", async () => {
    const files = ["file1.txt", "file2.txt", "file3.txt"];

    for (const file of files) {
      await fs.writeFile(file, `Content of ${file}`);
    }

    await add(files);
    await commit("Multiple files commit");

    const commitHash = await getCurrentCommitHash();
    expect(commitHash).toBeDefined();

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("3 file(s) committed")
    );
  });

  test("should handle files in subdirectories", async () => {
    const subdir = "src";
    const fileName = "app.js";
    const filePath = path.join(subdir, fileName);

    await fs.mkdir(subdir, { recursive: true });
    await fs.writeFile(filePath, "console.log('Hello');");
    await add([filePath]);

    await commit("Add file in subdirectory");

    const commitHash = await getCurrentCommitHash();
    expect(commitHash).toBeTruthy();

    if (commitHash) {
      const commitContent = await readObject(commitHash);
      // Just verify the tree was created (format is tree [size]\0tree [hash]\n...)
      expect(commitContent).toContain("tree ");
    }
  });

  test("should create separate tree objects for subdirectories", async () => {
    // Create files in different directories
    await fs.mkdir("src", { recursive: true });
    await fs.mkdir("tests", { recursive: true });

    await fs.writeFile("README.md", "readme");
    await fs.writeFile("src/app.js", "app code");
    await fs.writeFile("tests/test.js", "test code");

    await add(["README.md", "src/app.js", "tests/test.js"]);
    await commit("Multiple directories");

    // Check that multiple tree objects were created
    const dirs = await fs.readdir(objectsPath);

    // Should have multiple objects (blobs + trees + commit)
    expect(dirs.length).toBeGreaterThan(3);
  });

  test("should preserve commit history", async () => {
    // Create multiple commits
    const commits = [
      { file: "file1.txt", message: "First commit" },
      { file: "file2.txt", message: "Second commit" },
      { file: "file3.txt", message: "Third commit" },
    ];

    const commitHashes = [];

    for (const { file, message } of commits) {
      await fs.writeFile(file, `Content of ${file}`);
      await add([file]);
      await commit(message);
      commitHashes.push(await getCurrentCommitHash());
    }

    // Verify each commit links to previous
    for (let i = 1; i < commitHashes.length; i++) {
      const commitContent = await readObject(commitHashes[i]);
      expect(commitContent).toContain(`parent ${commitHashes[i - 1]}`);
    }
  });

  test("should include author information in commit", async () => {
    const testFile = "author-test.txt";
    await fs.writeFile(testFile, "author test");
    await add([testFile]);
    await commit("Test author info");

    const commitHash = await getCurrentCommitHash();
    const commitContent = await readObject(commitHash);

    expect(commitContent).toMatch(/author .+ <.+@.+> \d+ [+-]\d{4}/);
    expect(commitContent).toMatch(/committer .+ <.+@.+> \d+ [+-]\d{4}/);
  });

  test("should include timestamp in commit", async () => {
    const testFile = "timestamp-test.txt";
    await fs.writeFile(testFile, "timestamp test");
    await add([testFile]);

    const beforeTime = Math.floor(Date.now() / 1000);
    await commit("Test timestamp");
    const afterTime = Math.floor(Date.now() / 1000);

    const commitHash = await getCurrentCommitHash();
    const commitContent = await readObject(commitHash);

    const timestampMatch = commitContent.match(/author .+ (\d+) /);
    expect(timestampMatch).toBeTruthy();

    const timestamp = parseInt(timestampMatch[1]);
    expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
    expect(timestamp).toBeLessThanOrEqual(afterTime);
  });

  test("should store commit message correctly", async () => {
    const testFile = "message-test.txt";
    await fs.writeFile(testFile, "message test");
    await add([testFile]);

    const message = "This is a test commit message\nWith multiple lines";
    await commit(message);

    const commitHash = await getCurrentCommitHash();
    const commitContent = await readObject(commitHash);

    expect(commitContent).toContain(message);
  });

  test("should handle empty commit message gracefully", async () => {
    const testFile = "test.txt";
    await fs.writeFile(testFile, "content");
    await add([testFile]);

    await commit(null);

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Please provide a commit message")
    );
  });

  test("should compress commit objects", async () => {
    const testFile = "compress-test.txt";
    await fs.writeFile(testFile, "compression test");
    await add([testFile]);
    await commit("Test compression");

    const commitHash = await getCurrentCommitHash();
    const dir = commitHash.substring(0, 2);
    const file = commitHash.substring(2);
    const objectPath = path.join(objectsPath, dir, file);

    // Read compressed content
    const compressed = await fs.readFile(objectPath);

    // Decompress to verify it's actually compressed
    const decompressed = zlib.inflateSync(compressed);

    // Compressed size should be smaller than decompressed
    // (not always true for very small content, but should work for commit objects)
    expect(compressed.length).toBeLessThanOrEqual(decompressed.length);
  });

  test("should create refs/heads directory if it doesn't exist", async () => {
    // Remove refs directory
    await fs.rm(path.join(magitshPath, "refs"), { recursive: true, force: true });

    const testFile = "test.txt";
    await fs.writeFile(testFile, "content");
    await add([testFile]);
    await commit("Test refs creation");

    // refs/heads should be created
    const exists = await fs
      .access(refsPath)
      .then(() => true)
      .catch(() => false);

    expect(exists).toBe(true);
  });

  test("should fail gracefully if not in a repository", async () => {
    await fs.rm(magitshPath, { recursive: true, force: true });

    await commit("This should fail");

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Error in commit command")
    );

    await init();
  });

  test("should generate unique hashes for different commits", async () => {
    const file1 = "file1.txt";
    await fs.writeFile(file1, "content1");
    await add([file1]);
    await commit("First commit");
    const hash1 = await getCurrentCommitHash();

    const file2 = "file2.txt";
    await fs.writeFile(file2, "content2");
    await add([file2]);
    await commit("Second commit");
    const hash2 = await getCurrentCommitHash();

    expect(hash1).not.toBe(hash2);
  });

  test("should handle large commit messages", async () => {
    const testFile = "test.txt";
    await fs.writeFile(testFile, "content");
    await add([testFile]);

    const largeMessage = "A".repeat(1000) + "\n" + "B".repeat(1000);
    await commit(largeMessage);

    const commitHash = await getCurrentCommitHash();
    const commitContent = await readObject(commitHash);

    expect(commitContent).toContain(largeMessage);
  });
});
