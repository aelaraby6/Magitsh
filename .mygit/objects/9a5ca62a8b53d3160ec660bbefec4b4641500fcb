const fs = require("fs").promises;
const path = require("path");
const { init } = require("../src/commands/init");

global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
};

describe("Init Command", () => {
  const testDir = path.join(__dirname, "test-repo");
  const mygitPath = path.join(testDir, ".mygit");

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(__dirname);
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test("should create .mygit directory", async () => {
    await init();

    const exists = await fs
      .access(mygitPath)
      .then(() => true)
      .catch(() => false);

    expect(exists).toBe(true);
  });

  test("should create proper directory structure", async () => {
    await init();

    const dirsToCheck = [
      ".mygit/objects",
      ".mygit/objects/info",
      ".mygit/objects/pack",
      ".mygit/refs",
      ".mygit/refs/heads",
      ".mygit/refs/tags",
      ".mygit/hooks",
      ".mygit/info",
    ];

    for (const dir of dirsToCheck) {
      const dirPath = path.join(testDir, dir);
      const exists = await fs
        .access(dirPath)
        .then(() => true)
        .catch(() => false);

      expect(exists).toBe(true);
    }
  });

  test("should create config file with correct content", async () => {
    await init();

    const configPath = path.join(mygitPath, "config");
    const content = await fs.readFile(configPath, "utf-8");

    expect(content).toContain("[core]");
    expect(content).toContain("repositoryformatversion = 0");
    expect(content).toContain("bare = false");
  });

  test("should create HEAD file", async () => {
    await init();

    const headPath = path.join(mygitPath, "HEAD");
    const content = await fs.readFile(headPath, "utf-8");

    expect(content).toBe("ref: refs/heads/main\n");
  });

  test("should create description file", async () => {
    await init();

    const descPath = path.join(mygitPath, "description");
    const exists = await fs
      .access(descPath)
      .then(() => true)
      .catch(() => false);

    expect(exists).toBe(true);
  });

  test("should create hooks sample files", async () => {
    await init();

    const preCommitPath = path.join(mygitPath, "hooks", "pre-commit.sample");
    const commitMsgPath = path.join(mygitPath, "hooks", "commit-msg.sample");

    const preCommitExists = await fs
      .access(preCommitPath)
      .then(() => true)
      .catch(() => false);

    const commitMsgExists = await fs
      .access(commitMsgPath)
      .then(() => true)
      .catch(() => false);

    expect(preCommitExists).toBe(true);
    expect(commitMsgExists).toBe(true);
  });

  test("should create info/exclude file", async () => {
    await init();

    const excludePath = path.join(mygitPath, "info", "exclude");
    const exists = await fs
      .access(excludePath)
      .then(() => true)
      .catch(() => false);

    expect(exists).toBe(true);
  });

  test("should not reinitialize if already initialized", async () => {
    await init();
    await init();

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("already initialized")
    );
  });

  test("should handle errors gracefully", async () => {
    jest.spyOn(fs, "mkdir").mockRejectedValueOnce(new Error("Test error"));

    await init();

    expect(console.error).toHaveBeenCalled();
  });
});
