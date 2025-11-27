const fs = require("fs").promises;
const path = require("path");
const { add } = require("../src/commands/add");
const { init } = require("../src/commands/init");
const { commit } = require("../src/commands/commit");
const { log } = require("../src/commands/log");

global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
};

describe("Log Command", () => {
  const testDir = path.join(__dirname, "test-log-repo");
  const mygitPath = path.join(testDir, ".mygit");

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

  test("should show message when no commits exist", async () => {
    await log();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("No commits yet")
    );
  });

  test("should display a single commit", async () => {
    await fs.writeFile("test.txt", "content");
    await add(["test.txt"]);
    await commit("First commit");

    console.log.mockClear();
    await log();

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("commit"));
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("First commit")
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Author:")
    );
  });

  test("should display multiple commits in reverse order", async () => {
    const commits = ["First", "Second", "Third"];

    for (let i = 0; i < commits.length; i++) {
      await fs.writeFile(`file${i}.txt`, `content ${i}`);
      await add([`file${i}.txt`]);
      await commit(`${commits[i]} commit`);
    }

    console.log.mockClear();
    await log();

    const logOutput = console.log.mock.calls
      .map((call) => call.join(" "))
      .join("\n");

    expect(logOutput).toContain("First commit");
    expect(logOutput).toContain("Second commit");
    expect(logOutput).toContain("Third commit");

    // Check reverse order
    const thirdIndex = logOutput.indexOf("Third commit");
    const secondIndex = logOutput.indexOf("Second commit");
    const firstIndex = logOutput.indexOf("First commit");

    expect(thirdIndex).toBeLessThan(secondIndex);
    expect(secondIndex).toBeLessThan(firstIndex);
  });

  test("should display commit count", async () => {
    await fs.writeFile("test.txt", "content");
    await add(["test.txt"]);
    await commit("Test commit");

    console.log.mockClear();
    await log();

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Total commits: 1")
    );
  });

  test("should display commit message with indentation", async () => {
    await fs.writeFile("test.txt", "content");
    await add(["test.txt"]);
    await commit("Test commit");

    console.log.mockClear();
    await log();

    const messageCalls = console.log.mock.calls.filter((call) => {
      const text = call.join(" ");
      return text.includes("Test commit") && text.startsWith("    ");
    });

    expect(messageCalls.length).toBeGreaterThan(0);
  });

  test("should fail gracefully if not in a repository", async () => {
    await fs.rm(mygitPath, { recursive: true, force: true });
    await log();

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Error in log command")
    );
  });
});
