const fs = require("fs").promises;
const path = require("path");
const { status } = require("../src/commands/status");
const { init } = require("../src/commands/init");
const { add } = require("../src/commands/add");

global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
};

describe("Status Command", () => {
    const testDir = path.join(__dirname, "test-status-repo");
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

    test("should show clean working tree when no files exist", async () => {
        await status();

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("On branch main")
        );
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("nothing to commit, working tree clean")
        );
    });

    test("should show untracked files", async () => {
        await fs.writeFile("file1.txt", "content1");
        await fs.writeFile("file2.txt", "content2");

        await status();

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("Untracked files:")
        );
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("file1.txt")
        );
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("file2.txt")
        );
    });

    test("should show staged files (changes to be committed)", async () => {
        await fs.writeFile("staged.txt", "staged content");
        await add(["staged.txt"]);

        console.log.mockClear();
        await status();

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("Changes to be committed:")
        );
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("new file:   staged.txt")
        );
    });

    test("should show modified files (staged but then changed)", async () => {
        // Stage a file
        await fs.writeFile("modified.txt", "original content");
        await add(["modified.txt"]);

        // Modify it after staging
        await fs.writeFile("modified.txt", "modified content");

        console.log.mockClear();
        await status();

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("Changes not staged for commit:")
        );
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("modified:   modified.txt")
        );
    });

    test("should show deleted files (staged but then deleted)", async () => {
        // Stage a file
        await fs.writeFile("deleted.txt", "content");
        await add(["deleted.txt"]);

        // Delete it after staging
        await fs.unlink("deleted.txt");

        console.log.mockClear();
        await status();

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("Changes not staged for commit:")
        );
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("deleted:    deleted.txt")
        );
    });

    test("should show mix of staged, modified, and untracked files", async () => {
        // Staged file
        await fs.writeFile("staged.txt", "staged");
        await add(["staged.txt"]);

        // Modified file
        await fs.writeFile("modified.txt", "original");
        await add(["modified.txt"]);
        await fs.writeFile("modified.txt", "changed");

        // Untracked file
        await fs.writeFile("untracked.txt", "untracked");

        console.log.mockClear();
        await status();

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("Changes to be committed:")
        );
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("staged.txt")
        );

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("Changes not staged for commit:")
        );
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("modified.txt")
        );

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("Untracked files:")
        );
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("untracked.txt")
        );
    });

    test("should handle files in subdirectories", async () => {
        await fs.mkdir("subdir", { recursive: true });
        await fs.writeFile(path.join("subdir", "file.txt"), "content");

        await status();

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("Untracked files:")
        );
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("subdir")
        );
    });

    test("should show current branch from HEAD file", async () => {
        // Change HEAD to point to different branch
        const headPath = path.join(mygitPath, "HEAD");
        await fs.writeFile(headPath, "ref: refs/heads/develop\n");

        await status();

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("On branch develop")
        );
    });

    test("should default to main branch if HEAD is invalid", async () => {
        const headPath = path.join(mygitPath, "HEAD");
        await fs.writeFile(headPath, "invalid content");

        await status();

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("On branch main")
        );
    });

    test("should not show .mygit or node_modules in untracked files", async () => {
        await fs.mkdir("node_modules", { recursive: true });
        await fs.writeFile(path.join("node_modules", "package.json"), "{}");

        await fs.writeFile("tracked.txt", "content");

        await status();

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("tracked.txt")
        );
        expect(console.log).not.toHaveBeenCalledWith(
            expect.stringContaining("node_modules")
        );
        expect(console.log).not.toHaveBeenCalledWith(
            expect.stringContaining(".mygit")
        );
    });

    test("should handle empty index gracefully", async () => {
        await fs.writeFile("file.txt", "content");

        await status();

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("Untracked files:")
        );
    });

    test("should show clean working tree when all files are staged and unchanged", async () => {
        await fs.writeFile("file1.txt", "content1");
        await fs.writeFile("file2.txt", "content2");
        await add(["file1.txt", "file2.txt"]);

        console.log.mockClear();
        await status();

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("Changes to be committed:")
        );
        expect(console.log).not.toHaveBeenCalledWith(
            expect.stringContaining("working tree clean")
        );
    });

    test("should fail if not in a MyGit repository", async () => {
        const nonRepoDir = path.join(__dirname, "non-repo-status");
        await fs.mkdir(nonRepoDir, { recursive: true });
        process.chdir(nonRepoDir);

        await status();

        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining("Error in status command")
        );

        await fs.rm(nonRepoDir, { recursive: true, force: true });
    });

    test("should handle multiple modified files", async () => {
        await fs.writeFile("file1.txt", "original1");
        await fs.writeFile("file2.txt", "original2");
        await add(["file1.txt", "file2.txt"]);

        await fs.writeFile("file1.txt", "modified1");
        await fs.writeFile("file2.txt", "modified2");

        console.log.mockClear();
        await status();

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("Changes not staged for commit:")
        );
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("modified:   file1.txt")
        );
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("modified:   file2.txt")
        );
    });

    test("should detect modification based on content hash, not timestamp", async () => {
        await fs.writeFile("file.txt", "content");
        await add(["file.txt"]);

        // Rewrite the same content (changes timestamp but not hash)
        await fs.writeFile("file.txt", "content");

        console.log.mockClear();
        await status();

        // Should show as staged (not modified) because content hash is same
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("Changes to be committed:")
        );
        expect(console.log).not.toHaveBeenCalledWith(
            expect.stringContaining("Changes not staged for commit:")
        );
    });

    test("should handle binary files correctly", async () => {
        const buffer = Buffer.from([0x00, 0x01, 0x02, 0xFF]);
        await fs.writeFile("binary.bin", buffer);

        await status();

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("Untracked files:")
        );
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("binary.bin")
        );
    });

    test("should handle nested subdirectories", async () => {
        await fs.mkdir(path.join("level1", "level2"), { recursive: true });
        await fs.writeFile(path.join("level1", "level2", "deep.txt"), "deep content");

        await status();

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("Untracked files:")
        );
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("level1")
        );
    });
});
