const fs = require("fs").promises;
const path = require("path");
const { diff } = require("../src/commands/diff");
const { init } = require("../src/commands/init");
const { add } = require("../src/commands/add");
const { commit } = require("../src/commands/commit");

global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
};

describe("Diff Command", () => {
    const testDir = path.join(__dirname, "test-diff-repo");
    const magitshPath = path.join(testDir, ".magitsh");

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

    async function getCurrentCommitHash() {
        const headPath = path.join(magitshPath, "HEAD");
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

    test("should show no changes when working tree is clean", async () => {
        await fs.writeFile("file1.txt", "content1");
        await add(["file1.txt"]);
        await commit("Initial commit");

        console.log.mockClear();
        await diff({});

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("No changes in working tree")
        );
    });

    test("should show diff for modified file in working tree", async () => {
        await fs.writeFile("file1.txt", "line1\nline2\nline3");
        await add(["file1.txt"]);

        await fs.writeFile("file1.txt", "line1\nmodified line2\nline3");

        console.log.mockClear();
        await diff({});

        const output = console.log.mock.calls.map(call => call[0]).join("\n");
        expect(output).toContain("diff --git");
        expect(output).toContain("file1.txt");
        expect(output).toContain("-line2");
        expect(output).toContain("+modified line2");
    });

    test("should show diff for added lines", async () => {
        await fs.writeFile("file1.txt", "line1\nline2");
        await add(["file1.txt"]);

        await fs.writeFile("file1.txt", "line1\nline2\nline3\nline4");

        console.log.mockClear();
        await diff({});

        const output = console.log.mock.calls.map(call => call[0]).join("\n");
        expect(output).toContain("+line3");
        expect(output).toContain("+line4");
    });

    test("should show diff for deleted lines", async () => {
        await fs.writeFile("file1.txt", "line1\nline2\nline3\nline4");
        await add(["file1.txt"]);

        await fs.writeFile("file1.txt", "line1\nline2");

        console.log.mockClear();
        await diff({});

        const output = console.log.mock.calls.map(call => call[0]).join("\n");
        expect(output).toContain("-line3");
        expect(output).toContain("-line4");
    });

    test("should show staged changes with --staged option", async () => {
        await fs.writeFile("file1.txt", "original content");
        await add(["file1.txt"]);
        await commit("Initial commit");

        await fs.writeFile("file1.txt", "modified content");
        await add(["file1.txt"]);

        console.log.mockClear();
        await diff({ staged: true });

        const output = console.log.mock.calls.map(call => call[0]).join("\n");
        expect(output).toContain("diff --git");
        expect(output).toContain("-original content");
        expect(output).toContain("+modified content");
    });

    test("should show diff between working tree and specific commit", async () => {
        await fs.writeFile("file1.txt", "version 1");
        await add(["file1.txt"]);
        await commit("Commit 1");
        const commit1 = await getCurrentCommitHash();

        await fs.writeFile("file1.txt", "version 2");
        await add(["file1.txt"]);
        await commit("Commit 2");

        await fs.writeFile("file1.txt", "version 3");

        console.log.mockClear();
        await diff({ commits: [commit1] });

        const output = console.log.mock.calls.map(call => call[0]).join("\n");
        expect(output).toContain("-version 1");
        expect(output).toContain("+version 3");
    });

    test("should show diff between two commits", async () => {
        await fs.writeFile("file1.txt", "version 1");
        await add(["file1.txt"]);
        await commit("Commit 1");
        const commit1 = await getCurrentCommitHash();

        await fs.writeFile("file1.txt", "version 2");
        await add(["file1.txt"]);
        await commit("Commit 2");
        const commit2 = await getCurrentCommitHash();

        console.log.mockClear();
        await diff({ commits: [commit1, commit2] });

        const output = console.log.mock.calls.map(call => call[0]).join("\n");
        expect(output).toContain("-version 1");
        expect(output).toContain("+version 2");
    });

    test("should handle file deletion in diff", async () => {
        await fs.writeFile("file1.txt", "content to delete");
        await add(["file1.txt"]);

        await fs.unlink("file1.txt");

        console.log.mockClear();
        await diff({});

        const output = console.log.mock.calls.map(call => call[0]).join("\n");
        expect(output).toContain("diff --git");
        expect(output).toContain("-content to delete");
    });

    test("should handle multiple files in diff", async () => {
        await fs.writeFile("file1.txt", "content1");
        await fs.writeFile("file2.txt", "content2");
        await add(["file1.txt", "file2.txt"]);

        await fs.writeFile("file1.txt", "modified1");
        await fs.writeFile("file2.txt", "modified2");

        console.log.mockClear();
        await diff({});

        const output = console.log.mock.calls.map(call => call[0]).join("\n");
        expect(output).toContain("file1.txt");
        expect(output).toContain("file2.txt");
        expect(output).toContain("-content1");
        expect(output).toContain("+modified1");
        expect(output).toContain("-content2");
        expect(output).toContain("+modified2");
    });

    test("should show all files as new when no commits exist with --staged", async () => {
        await fs.writeFile("file1.txt", "new content");
        await add(["file1.txt"]);

        console.log.mockClear();
        await diff({ staged: true });

        const output = console.log.mock.calls.map(call => call[0]).join("\n");
        expect(output).toContain("No commits yet");
        expect(output).toContain("+new content");
    });

    test("should handle files in subdirectories", async () => {
        await fs.mkdir("subdir", { recursive: true });
        await fs.writeFile("subdir/file1.txt", "original");
        await add(["subdir/file1.txt"]);

        await fs.writeFile("subdir/file1.txt", "modified");

        console.log.mockClear();
        await diff({});

        const output = console.log.mock.calls.map(call => call[0]).join("\n");
        expect(output).toContain("subdir/file1.txt");
        expect(output).toContain("-original");
        expect(output).toContain("+modified");
    });

    test("should show context lines around changes", async () => {
        const content = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join("\n");
        await fs.writeFile("file1.txt", content);
        await add(["file1.txt"]);

        const modifiedContent = content.replace("line 10", "modified line 10");
        await fs.writeFile("file1.txt", modifiedContent);

        console.log.mockClear();
        await diff({});

        const output = console.log.mock.calls.map(call => call[0]).join("\n");
        expect(output).toContain("line 9");  // Context before
        expect(output).toContain("-line 10");
        expect(output).toContain("+modified line 10");
        expect(output).toContain("line 11"); // Context after
    });

    test("should handle empty file creation", async () => {
        await fs.writeFile("empty.txt", "");
        await add(["empty.txt"]);
        await commit("Add empty file");

        await fs.writeFile("empty.txt", "now has content");

        console.log.mockClear();
        await diff({});

        const output = console.log.mock.calls.map(call => call[0]).join("\n");
        expect(output).toContain("+now has content");
    });
});
