const fs = require("fs").promises;
const path = require("path");
const { init } = require("../src/commands/init");
const { add } = require("../src/commands/add");
const { commit } = require("../src/commands/commit");
const {checkout }= require("../src/commands/chekout");

global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
};

describe("Checkout Command", () => {
  const testDir = path.join(__dirname, "test-checkout-repo");
  const magitshPath = path.join(testDir, ".magitsh");

  beforeEach(async () => {
    jest.spyOn(process, "exit").mockImplementation(() => {});

    await fs.mkdir(testDir, { recursive: true });
    process.chdir(testDir);
    await init();

    await fs.writeFile("test.txt", "content");
    await add(["test.txt"]);
    await commit("Initial commit");

    console.log.mockClear();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    process.chdir(__dirname);
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test("should create new branch", async () => {
    await checkout({ branchName: "feature", createNew: true });

    const branchPath = path.join(magitshPath, "refs", "heads", "feature");
    const exists = await fs.access(branchPath).then(() => true).catch(() => false);
    
    expect(exists).toBe(true);
  });

  test("should switch to new branch", async () => {
    await checkout({ branchName: "dev", createNew: true });

    const headContent = await fs.readFile(path.join(magitshPath, "HEAD"), "utf8");
    expect(headContent.trim()).toBe("ref: refs/heads/dev");
  });

  test("should switch between branches", async () => {
    await checkout({ branchName: "feature", createNew: true });
    await checkout({ branchName: "main", createNew: false });

    const headContent = await fs.readFile(path.join(magitshPath, "HEAD"), "utf8");
    expect(headContent.trim()).toBe("ref: refs/heads/main");
  });
});