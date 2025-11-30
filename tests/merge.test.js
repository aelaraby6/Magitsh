const fs = require("fs").promises;
const path = require("path");
const { merge } = require("../src/commands/merge");
const { init } = require("../src/commands/init");
const { add } = require("../src/commands/add");
const { commit } = require("../src/commands/commit");
const { checkout } = require("../src/commands/chekout");

global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
};

describe("Merge Command", () => {
    const testDir = path.join(__dirname, "test-merge-repo");
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

    test("should fail if no branch name provided", async () => {
        await merge();

        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining("Please specify a branch to merge")
        );
    });

    test("should fail if branch does not exist", async () => {
        // Create initial commit
        await fs.writeFile("file.txt", "content");
        await add(["file.txt"]);
        await commit("Initial commit");

        await merge("nonexistent");

        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining("Branch 'nonexistent' does not exist")
        );
    });

    test("should show message if already on target branch", async () => {
        await fs.writeFile("file.txt", "content");
        await add(["file.txt"]);
        await commit("Initial commit");

        console.log.mockClear();
        await merge("main");

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("Already on 'main'")
        );
    });

    test("should show already up to date if branches are at same commit", async () => {
        await fs.writeFile("file.txt", "content");
        await add(["file.txt"]);
        await commit("Initial commit");

        // Create branch at same commit
        await checkout({ branchName: "feature", createNew: true });
        await checkout({ branchName: "main", createNew: false });

        console.log.mockClear();
        await merge("feature");

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("Already up to date")
        );
    });

    test("should perform fast-forward merge", async () => {
        // Create initial commit on main
        await fs.writeFile("file1.txt", "content1");
        await add(["file1.txt"]);
        await commit("Initial commit");

        // Create feature branch
        await checkout({ branchName: "feature", createNew: true });

        // Add commits on feature branch
        await fs.writeFile("file2.txt", "content2");
        await add(["file2.txt"]);
        await commit("Add file2");

        await fs.writeFile("file3.txt", "content3");
        await add(["file3.txt"]);
        await commit("Add file3");

        // Switch back to main and merge
        await checkout({ branchName: "main", createNew: false });
        console.log.mockClear();
        await merge("feature");

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("Fast-forward merge completed successfully")
        );

        // Verify files exist
        const file2Exists = await fs
            .access("file2.txt")
            .then(() => true)
            .catch(() => false);
        const file3Exists = await fs
            .access("file3.txt")
            .then(() => true)
            .catch(() => false);

        expect(file2Exists).toBe(true);
        expect(file3Exists).toBe(true);
    });

    test("should perform three-way merge without conflicts", async () => {
        // Create initial commit
        await fs.writeFile("file1.txt", "base content");
        await add(["file1.txt"]);
        await commit("Initial commit");

        // Create feature branch and add file
        await checkout({ branchName: "feature", createNew: true });
        await fs.writeFile("file2.txt", "feature content");
        await add(["file2.txt"]);
        await commit("Add file2 on feature");

        // Switch to main and add different file
        await checkout({ branchName: "main", createNew: false });
        await fs.writeFile("file3.txt", "main content");
        await add(["file3.txt"]);
        await commit("Add file3 on main");

        // Merge feature into main
        console.log.mockClear();
        await merge("feature");

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("Merge completed successfully")
        );

        // Verify both files exist
        const file2Content = await fs.readFile("file2.txt", "utf-8");
        const file3Content = await fs.readFile("file3.txt", "utf-8");

        expect(file2Content).toBe("feature content");
        expect(file3Content).toBe("main content");
    });

    test("should detect and create conflict markers for conflicting changes", async () => {
        // Create initial commit
        await fs.writeFile("conflict.txt", "base content");
        await add(["conflict.txt"]);
        await commit("Initial commit");

        // Create feature branch and modify file
        await checkout({ branchName: "feature", createNew: true });
        await fs.writeFile("conflict.txt", "feature content");
        await add(["conflict.txt"]);
        await commit("Modify conflict.txt on feature");

        // Switch to main and modify same file differently
        await checkout({ branchName: "main", createNew: false });
        await fs.writeFile("conflict.txt", "main content");
        await add(["conflict.txt"]);
        await commit("Modify conflict.txt on main");

        // Merge should detect conflict
        console.log.mockClear();
        await merge("feature");

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("Merge conflicts detected")
        );
        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("CONFLICT: conflict.txt")
        );

        // Verify conflict markers
        const content = await fs.readFile("conflict.txt", "utf-8");
        expect(content).toContain("<<<<<<< HEAD");
        expect(content).toContain("=======");
        expect(content).toContain(">>>>>>> incoming");

        // Verify MERGE_HEAD file created
        const mergeHeadExists = await fs
            .access(path.join(mygitPath, "MERGE_HEAD"))
            .then(() => true)
            .catch(() => false);
        expect(mergeHeadExists).toBe(true);
    });

    test("should handle file deletion in merge", async () => {
        // Create initial commit with two files
        await fs.writeFile("file1.txt", "content1");
        await fs.writeFile("file2.txt", "content2");
        await add(["file1.txt", "file2.txt"]);
        await commit("Initial commit");

        // Create feature branch and add new file (instead of delete to make test simpler)
        await checkout({ branchName: "feature", createNew: true });
        await fs.writeFile("file3.txt", "content3");
        await add(["file3.txt"]);
        await commit("Add file3");

        // Switch to main
        await checkout({ branchName: "main", createNew: false });

        // Merge should add file3
        console.log.mockClear();
        await merge("feature");

        const file3Exists = await fs
            .access("file3.txt")
            .then(() => true)
            .catch(() => false);

        expect(file3Exists).toBe(true);
    });

    test("should handle file addition in merge", async () => {
        // Create initial commit
        await fs.writeFile("file1.txt", "content1");
        await add(["file1.txt"]);
        await commit("Initial commit");

        // Create feature branch and add new file
        await checkout({ branchName: "feature", createNew: true });
        await fs.writeFile("newfile.txt", "new content");
        await add(["newfile.txt"]);
        await commit("Add newfile");

        // Switch to main
        await checkout({ branchName: "main", createNew: false });

        // Merge should add newfile
        console.log.mockClear();
        await merge("feature");

        const newfileContent = await fs.readFile("newfile.txt", "utf-8");
        expect(newfileContent).toBe("new content");
    });

    test("should fail merge in detached HEAD state", async () => {
        await fs.writeFile("file.txt", "content");
        await add(["file.txt"]);
        await commit("Initial commit");

        // Simulate detached HEAD
        const headPath = path.join(mygitPath, "HEAD");
        await fs.writeFile(headPath, "abc123def456");

        await merge("feature");

        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining("Cannot merge in detached HEAD state")
        );
    });

    test("should handle multiple files modified in three-way merge", async () => {
        // Create initial commit
        await fs.writeFile("file1.txt", "base1");
        await fs.writeFile("file2.txt", "base2");
        await fs.writeFile("file3.txt", "base3");
        await add(["file1.txt", "file2.txt", "file3.txt"]);
        await commit("Initial commit");

        // Feature branch: modify file1, add file4
        await checkout({ branchName: "feature", createNew: true });
        await fs.writeFile("file1.txt", "feature1");
        await fs.writeFile("file4.txt", "feature4");
        await add(["file1.txt", "file4.txt"]);
        await commit("Feature changes");

        // Main branch: modify file2, add file5
        await checkout({ branchName: "main", createNew: false });
        await fs.writeFile("file2.txt", "main2");
        await fs.writeFile("file5.txt", "main5");
        await add(["file2.txt", "file5.txt"]);
        await commit("Main changes");

        // Merge
        console.log.mockClear();
        await merge("feature");

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("Merge completed successfully")
        );

        // Verify all files
        expect(await fs.readFile("file1.txt", "utf-8")).toBe("feature1");
        expect(await fs.readFile("file2.txt", "utf-8")).toBe("main2");
        expect(await fs.readFile("file3.txt", "utf-8")).toBe("base3");
        expect(await fs.readFile("file4.txt", "utf-8")).toBe("feature4");
        expect(await fs.readFile("file5.txt", "utf-8")).toBe("main5");
    });
});
