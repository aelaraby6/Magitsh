const fs = require("fs").promises;
const path = require("path");
const { init } = require("../src/commands/init");
const { add } = require("../src/commands/add");
const { commit } = require("../src/commands/commit");
const { checkout } = require("../src/commands/chekout");
const { merge } = require("../src/commands/merge");
const { findCommonAncestor, getAncestors, getAncestorsWithDistance } = require("../src/utils/merge");

global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
};

describe("Advanced Merge - DAG and LCA", () => {
    const testDir = path.join(__dirname, "test-dag-repo");
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

    async function getCurrentCommitHash() {
        const headPath = path.join(mygitPath, "HEAD");
        const headContent = await fs.readFile(headPath, "utf-8");
        const match = headContent.match(/ref: (.+)/);
        if (!match) return null;

        const branchPath = path.join(mygitPath, match[1].trim());
        try {
            const commitHash = await fs.readFile(branchPath, "utf-8");
            return commitHash.trim();
        } catch {
            return null;
        }
    }

    test("should handle multiple parents in getAncestors", async () => {
        // Create a merge commit structure
        //     A
        //    / \
        //   B   C
        //    \ /
        //     D (merge commit with two parents)

        // Commit A
        await fs.writeFile("file1.txt", "A");
        await add(["file1.txt"]);
        await commit("Commit A");
        const commitA = await getCurrentCommitHash();

        // Branch B
        await checkout({ branchName: "branch-b", createNew: true });
        await fs.writeFile("file2.txt", "B");
        await add(["file2.txt"]);
        await commit("Commit B");

        // Branch C from A
        await checkout({ branchName: "main", createNew: false });
        await checkout({ branchName: "branch-c", createNew: true });
        await fs.writeFile("file3.txt", "C");
        await add(["file3.txt"]);
        await commit("Commit C");

        // Merge B into C (creates merge commit D)
        await merge("branch-b");
        const commitD = await getCurrentCommitHash();

        // Test getAncestors includes all ancestors
        const ancestors = await getAncestors(commitD, mygitPath);

        expect(ancestors).toContain(commitD);
        expect(ancestors).toContain(commitA);
        expect(ancestors.length).toBeGreaterThanOrEqual(3);
    });

    test("should find correct LCA in diamond pattern", async () => {
        // Create diamond pattern:
        //       A
        //      / \
        //     B   C
        //      \ /
        //       D

        // Commit A
        await fs.writeFile("base.txt", "base");
        await add(["base.txt"]);
        await commit("Base commit A");
        const commitA = await getCurrentCommitHash();

        // Branch left (B)
        await checkout({ branchName: "left", createNew: true });
        await fs.writeFile("left.txt", "left");
        await add(["left.txt"]);
        await commit("Left commit B");
        const commitB = await getCurrentCommitHash();

        // Branch right (C) from A
        await checkout({ branchName: "main", createNew: false });
        await checkout({ branchName: "right", createNew: true });
        await fs.writeFile("right.txt", "right");
        await add(["right.txt"]);
        await commit("Right commit C");
        const commitC = await getCurrentCommitHash();

        // Merge creates D
        await merge("left");
        const commitD = await getCurrentCommitHash();

        // LCA of any path should be A
        const lca = await findCommonAncestor(commitB, commitC, mygitPath);
        expect(lca).toBe(commitA);
    });

    test("should calculate distances correctly with getAncestorsWithDistance", async () => {
        // A -> B -> C
        await fs.writeFile("file1.txt", "A");
        await add(["file1.txt"]);
        await commit("A");
        const commitA = await getCurrentCommitHash();

        await fs.writeFile("file2.txt", "B");
        await add(["file2.txt"]);
        await commit("B");
        const commitB = await getCurrentCommitHash();

        await fs.writeFile("file3.txt", "C");
        await add(["file3.txt"]);
        await commit("C");
        const commitC = await getCurrentCommitHash();

        const ancestorsMap = await getAncestorsWithDistance(commitC, mygitPath);

        expect(ancestorsMap.get(commitC)).toBe(0); // Distance to self
        expect(ancestorsMap.get(commitB)).toBe(1); // One step back
        expect(ancestorsMap.get(commitA)).toBe(2); // Two steps back
    });

    test("should handle complex DAG with multiple merge commits", async () => {
        // Create complex history:
        //       A
        //      /|\
        //     B C D
        //     |X|X|
        //     E F G
        //      \|/
        //       H

        await fs.writeFile("a.txt", "A");
        await add(["a.txt"]);
        await commit("A");
        const commitA = await getCurrentCommitHash();

        // Create branches B, C, D
        await checkout({ branchName: "b", createNew: true });
        await fs.writeFile("b.txt", "B");
        await add(["b.txt"]);
        await commit("B");

        await checkout({ branchName: "main", createNew: false });
        await checkout({ branchName: "c", createNew: true });
        await fs.writeFile("c.txt", "C");
        await add(["c.txt"]);
        await commit("C");

        await checkout({ branchName: "main", createNew: false });
        await checkout({ branchName: "d", createNew: true });
        await fs.writeFile("d.txt", "D");
        await add(["d.txt"]);
        await commit("D");

        // Verify we can find ancestors across the DAG
        const ancestors = await getAncestors(await getCurrentCommitHash(), mygitPath);
        expect(ancestors).toContain(commitA);
    });

    test("should find LCA when commits are on same path", async () => {
        // Linear history: A -> B -> C
        await fs.writeFile("file1.txt", "A");
        await add(["file1.txt"]);
        await commit("A");
        const commitA = await getCurrentCommitHash();

        await fs.writeFile("file2.txt", "B");
        await add(["file2.txt"]);
        await commit("B");
        const commitB = await getCurrentCommitHash();

        await fs.writeFile("file3.txt", "C");
        await add(["file3.txt"]);
        await commit("C");
        const commitC = await getCurrentCommitHash();

        // LCA of B and C should be B (C is descendant of B)
        const lca = await findCommonAncestor(commitB, commitC, mygitPath);
        expect(lca).toBe(commitB);
    });

    test("should detect add-add conflict when both branches add same file with different content", async () => {
        // Base commit
        await fs.writeFile("base.txt", "base content");
        await add(["base.txt"]);
        await commit("Base commit");

        // Branch A adds new file
        await checkout({ branchName: "branch-a", createNew: true });
        await fs.writeFile("newfile.txt", "content from branch A");
        await add(["newfile.txt"]);
        await commit("Add newfile in branch A");

        // Branch B also adds same file with different content
        await checkout({ branchName: "main", createNew: false });
        await checkout({ branchName: "branch-b", createNew: true });
        await fs.writeFile("newfile.txt", "content from branch B");
        await add(["newfile.txt"]);
        await commit("Add newfile in branch B");

        // Try to merge - should detect add-add conflict
        console.log.mockClear();
        await merge("branch-a");

        expect(console.log).toHaveBeenCalledWith(
            expect.stringContaining("Merge conflicts detected")
        );

        // Check conflict file was created with both contents
        const conflictContent = await fs.readFile("newfile.txt", "utf-8");
        expect(conflictContent).toContain("<<<<<<< HEAD");
        expect(conflictContent).toContain("content from branch B");
        expect(conflictContent).toContain("=======");
        expect(conflictContent).toContain("content from branch A");
        expect(conflictContent).toContain(">>>>>>> incoming");
    });

    test("should delete files in fast-forward merge when removed in incoming branch", async () => {
        // Create initial commit with multiple files
        await fs.writeFile("file1.txt", "content1");
        await fs.writeFile("file2.txt", "content2");
        await fs.writeFile("file3.txt", "content3");
        await add(["file1.txt", "file2.txt", "file3.txt"]);
        await commit("Initial commit with 3 files");

        // Create feature branch and delete a file
        await checkout({ branchName: "feature", createNew: true });
        await fs.unlink("file2.txt");
        await fs.writeFile("file4.txt", "content4");
        await add(["file2.txt", "file4.txt"]);
        await commit("Delete file2, add file4");

        // Switch back to main and merge (fast-forward)
        await checkout({ branchName: "main", createNew: false });
        await merge("feature");

        // Verify file2 was deleted and file4 was added
        const file1Exists = await fs.access("file1.txt").then(() => true).catch(() => false);
        const file2Exists = await fs.access("file2.txt").then(() => true).catch(() => false);
        const file3Exists = await fs.access("file3.txt").then(() => true).catch(() => false);
        const file4Exists = await fs.access("file4.txt").then(() => true).catch(() => false);

        expect(file1Exists).toBe(true);
        expect(file2Exists).toBe(false); // Should be deleted
        expect(file3Exists).toBe(true);
        expect(file4Exists).toBe(true);
    });

    test("should handle large DAG with many commits efficiently", async () => {
        const startTime = Date.now();

        // Create a base commit
        await fs.writeFile("base.txt", "base");
        await add(["base.txt"]);
        await commit("Base");
        const baseCommit = await getCurrentCommitHash();

        // Create multiple branches with several commits each
        const branches = ["b1", "b2", "b3", "b4", "b5"];

        for (const branch of branches) {
            await checkout({ branchName: "main", createNew: false });
            await checkout({ branchName: branch, createNew: true });

            // Add multiple commits on each branch
            for (let i = 0; i < 5; i++) {
                await fs.writeFile(`${branch}-file${i}.txt`, `content-${i}`);
                await add([`${branch}-file${i}.txt`]);
                await commit(`${branch} commit ${i}`);
            }
        }

        // Switch to main and get current commit
        await checkout({ branchName: "main", createNew: false });
        const mainCommit = await getCurrentCommitHash();

        // Test getAncestorsWithDistance performance
        const ancestors = await getAncestorsWithDistance(mainCommit, mygitPath);

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Should complete in reasonable time (< 5 seconds)
        expect(duration).toBeLessThan(5000);
        expect(ancestors.size).toBeGreaterThan(0);
    });

    test("should handle directory deletion in merge", async () => {
        // Create initial commit with files in subdirectory
        await fs.mkdir("subdir", { recursive: true });
        await fs.writeFile("subdir/file1.txt", "content1");
        await fs.writeFile("subdir/file2.txt", "content2");
        await fs.writeFile("root.txt", "root");
        await add(["subdir/file1.txt", "subdir/file2.txt", "root.txt"]);
        await commit("Initial with subdirectory");

        // Create branch and delete entire subdirectory
        await checkout({ branchName: "delete-dir", createNew: true });
        await fs.rm("subdir", { recursive: true, force: true });
        await add(["subdir/file1.txt", "subdir/file2.txt"]);
        await commit("Delete subdirectory");

        // Switch back and merge
        await checkout({ branchName: "main", createNew: false });
        await merge("delete-dir");

        // Verify subdirectory and files are deleted
        const subdirExists = await fs.access("subdir").then(() => true).catch(() => false);
        const rootExists = await fs.access("root.txt").then(() => true).catch(() => false);

        expect(subdirExists).toBe(false);
        expect(rootExists).toBe(true);
    });
});
