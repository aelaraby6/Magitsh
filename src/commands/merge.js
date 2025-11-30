const fs = require("fs").promises;
const path = require("path");
const chalk = require("chalk");
const { ensureMyGit, readIndex, writeIndex } = require("../utils/files");
const {
    findCommonAncestor,
    getCommitTree,
    detectConflicts,
    createConflictFile,
    applyMergeChanges,
    isFastForward,
    fastForwardMerge,
    readObjectContent,
} = require("../utils/merge");
const { createTreeObject } = require("../utils/tree");
const { createCommitObject, updateRefs } = require("../utils/commit.objects");

async function merge(branchName) {
    try {
        const repoPath = await ensureMyGit();

        if (!branchName) {
            throw new Error("Please specify a branch to merge");
        }

        const headPath = path.join(repoPath, "HEAD");
        const headContent = await fs.readFile(headPath, "utf-8");
        const match = headContent.match(/ref: (.+)/);

        if (!match) {
            throw new Error("Cannot merge in detached HEAD state");
        }

        const currentBranchRef = match[1].trim();
        const currentBranchName = currentBranchRef.split("/").pop();

        if (currentBranchName === branchName) {
            console.log(chalk.yellow(`Already on '${branchName}'`));
            return;
        }

        const incomingBranchPath = path.join(repoPath, "refs", "heads", branchName);
        try {
            await fs.access(incomingBranchPath);
        } catch {
            throw new Error(`Branch '${branchName}' does not exist`);
        }

        const currentBranchPath = path.join(repoPath, currentBranchRef);
        let currentCommitHash;
        try {
            currentCommitHash = await fs.readFile(currentBranchPath, "utf-8");
            currentCommitHash = currentCommitHash.trim();
        } catch {
            throw new Error("Current branch has no commits");
        }

        const incomingCommitHash = (
            await fs.readFile(incomingBranchPath, "utf-8")
        ).trim();

        if (currentCommitHash === incomingCommitHash) {
            console.log(chalk.green("Already up to date."));
            return;
        }

        console.log(chalk.cyan(`Merging '${branchName}' into '${currentBranchName}'...`));

        const canFastForward = await isFastForward(
            currentCommitHash,
            incomingCommitHash,
            repoPath
        );

        if (canFastForward) {
            await fastForwardMerge(repoPath, currentBranchRef, incomingCommitHash);

            const currentTree = await getCommitTree(currentCommitHash, repoPath);
            const incomingTree = await getCommitTree(incomingCommitHash, repoPath);

            for (const file of Object.keys(currentTree)) {
                if (!incomingTree[file]) {
                    const filePath = path.join(process.cwd(), file);
                    try {
                        await fs.unlink(filePath);
                    } catch {
                    }
                }
            }

            for (const [file, fileInfo] of Object.entries(incomingTree)) {
                const content = await readObjectContent(fileInfo.hash, repoPath);
                if (!content) {
                    throw new Error(`Failed to read object ${fileInfo.hash}`);
                }
                const filePath = path.join(process.cwd(), file);
                await fs.mkdir(path.dirname(filePath), { recursive: true });
                await fs.writeFile(filePath, content);
            }

            console.log(chalk.green("Fast-forward merge completed successfully!"));
            console.log(chalk.gray(`Updated ${currentBranchRef}`));
            return;
        }

        const baseCommitHash = await findCommonAncestor(
            currentCommitHash,
            incomingCommitHash,
            repoPath
        );

        if (!baseCommitHash) {
            throw new Error("No common ancestor found - cannot merge unrelated histories");
        }

        const currentTree = await getCommitTree(currentCommitHash, repoPath);
        const incomingTree = await getCommitTree(incomingCommitHash, repoPath);
        const baseTree = await getCommitTree(baseCommitHash, repoPath);

        const conflicts = await detectConflicts(
            currentTree,
            incomingTree,
            baseTree,
            repoPath
        );

        if (conflicts.length > 0) {
            console.log(chalk.red(`\n Merge conflicts detected in ${conflicts.length} file(s):\n`));

            for (const conflict of conflicts) {
                await createConflictFile(
                    conflict.file,
                    conflict.currentHash,
                    conflict.incomingHash,
                    repoPath
                );
                console.log(chalk.red(`  CONFLICT: ${conflict.file}`));
            }

            console.log(chalk.yellow("\nAutomatic merge failed; fix conflicts and then commit the result."));
            console.log(chalk.gray("Use 'mygit add <file>' to mark resolution"));
            console.log(chalk.gray("Use 'mygit commit' to complete the merge"));

            const mergeHeadPath = path.join(repoPath, "MERGE_HEAD");
            await fs.writeFile(mergeHeadPath, incomingCommitHash);

            const mergeMsgPath = path.join(repoPath, "MERGE_MSG");
            await fs.writeFile(
                mergeMsgPath,
                `Merge branch '${branchName}' into ${currentBranchName}\n\nConflicts:\n${conflicts.map((c) => `\t${c.file}`).join("\n")}\n`
            );

            return;
        }

        const changes = await applyMergeChanges(
            currentTree,
            incomingTree,
            baseTree,
            repoPath
        );

        console.log(chalk.green("\nMerge completed successfully!"));
        if (changes.added.length > 0) {
            console.log(chalk.green(`  Added: ${changes.added.length} file(s)`));
        }
        if (changes.modified.length > 0) {
            console.log(chalk.green(`  Modified: ${changes.modified.length} file(s)`));
        }
        if (changes.deleted.length > 0) {
            console.log(chalk.green(`  Deleted: ${changes.deleted.length} file(s)`));
        }

        const index = await readIndex(repoPath);
        const allFiles = new Set([
            ...Object.keys(currentTree),
            ...Object.keys(incomingTree),
        ]);

        for (const file of allFiles) {
            const filePath = path.join(process.cwd(), file);
            try {
                const content = await fs.readFile(filePath);
                const { sha1: hashFunc } = require("../utils/hash");
                const hash = hashFunc(content);
                const stat = await fs.stat(filePath);

                index[file] = {
                    hash,
                    size: stat.size,
                    mtime: stat.mtimeMs,
                };
            } catch {
                delete index[file];
            }
        }

        await writeIndex(repoPath, index);

        const treeHash = await createTreeObject(index, repoPath);
        const mergeMessage = `Merge branch '${branchName}' into ${currentBranchName}`;

        const mergeCommitHash = await createCommitObject({
            treeHash,
            parentHash: currentCommitHash,
            message: mergeMessage,
            repoPath,
            secondParent: incomingCommitHash,
        });

        await updateRefs(repoPath, mergeCommitHash);

        console.log(chalk.green.bold(`\n Merge commit created: ${mergeCommitHash}`));
    } catch (error) {
        console.error(chalk.red("Error in merge command:", error.message));
    }
}

module.exports = { merge };
