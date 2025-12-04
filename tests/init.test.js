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
  const magitshPath = path.join(testDir, ".magitsh");

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(__dirname);
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test("should create .magitsh directory", async () => {
    await init();

    const exists = await fs
      .access(magitshPath)
      .then(() => true)
      .catch(() => false);

    expect(exists).toBe(true);
  });

  test("should create proper directory structure", async () => {
    await init();

    const dirsToCheck = [
      ".magitsh/objects",
      ".magitsh/objects/info",
      ".magitsh/objects/pack",
      ".magitsh/refs",
      ".magitsh/refs/heads",
      ".magitsh/refs/tags",
      ".magitsh/hooks",
      ".magitsh/info",
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

    const configPath = path.join(magitshPath, "config");
    const content = await fs.readFile(configPath, "utf-8");

    expect(content).toContain("[core]");
    expect(content).toContain("repositoryformatversion = 0");
    expect(content).toContain("bare = false");
  });

  test("should create HEAD file", async () => {
    await init();

    const headPath = path.join(magitshPath, "HEAD");
    const content = await fs.readFile(headPath, "utf-8");

    expect(content).toBe("ref: refs/heads/main\n");
  });

  test("should create description file", async () => {
    await init();

    const descPath = path.join(magitshPath, "description");
    const exists = await fs
      .access(descPath)
      .then(() => true)
      .catch(() => false);

    expect(exists).toBe(true);
  });

  test("should create hooks sample files", async () => {
    await init();

    const preCommitPath = path.join(magitshPath, "hooks", "pre-commit.sample");
    const commitMsgPath = path.join(magitshPath, "hooks", "commit-msg.sample");

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

    const excludePath = path.join(magitshPath, "info", "exclude");
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
