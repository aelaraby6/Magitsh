const fs = require("fs").promises;
const path = require("path");
const { init } = require("../src/commands/init");
const { add } = require("../src/commands/add");
const { commit } = require("../src/commands/commit");
const { branch } = require("../src/commands/branch");
const { checkout } = require("../src/commands/chekout");

global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
};

describe("Branch Command", () => {
  const testDir = path.join(__dirname, "test-branch-repo");
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

  test("should list current branch", async () => {
    await branch();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("main"));
  });

  test("should list multiple branches", async () => {
    await checkout({ branchName: "dev", createNew: true });
    await checkout({ branchName: "feature", createNew: true });

    console.log.mockClear();
    await branch();

    const allCalls = console.log.mock.calls
      .map((call) => call.join(" "))
      .join("\n");

    expect(allCalls).toContain("main");
    expect(allCalls).toContain("dev");
    expect(allCalls).toContain("feature");
  });

  test("should highlight current branch", async () => {
    await checkout({ branchName: "dev", createNew: true });

    console.log.mockClear();
    await branch();

    const calls = console.log.mock.calls;
    const devCall = calls.find((call) => call.join(" ").includes("dev"));

    expect(devCall).toBeDefined();
    expect(devCall[0]).toContain("*");
  });
});
