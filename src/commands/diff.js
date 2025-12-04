const fs = require("fs").promises;
const path = require("path");
const chalk = require("chalk");
const { ensureMagitsh, readIndex } = require("../utils/files");
const { readCommitObject } = require("../utils/parse");
const { generateUnifiedDiff } = require("../utils/diff");
const { getCommitTree, readObjectContent } = require("../utils/merge");

function bufferToString(buffer) {
    if (!buffer || buffer.length === 0) {
        return "";
    }
    return buffer.toString("utf-8");
}

async function getCurrentCommit(repoPath) {
    const headPath = path.join(repoPath, "HEAD");
    const headContent = await fs.readFile(headPath, "utf-8");
    const match = headContent.match(/ref: (.+)/);

    if (!match) {
        return headContent.trim();
    }

    const branchPath = path.join(repoPath, match[1].trim());
    try {
        const commitHash = await fs.readFile(branchPath, "utf-8");
        return commitHash.trim();
    } catch {
        return null;
    }
}

/**
 * - magitsh diff (working tree vs staged/HEAD)
 * - magitsh diff --staged (staged vs HEAD)
 * - magitsh diff <commit> (working tree vs commit)
 * - magitsh diff <commit1> <commit2> (commit1 vs commit2)
 */
async function diff(options = {}) {
    try {
        const repoPath = await ensureMagitsh();
        const { staged, commits } = options;

        if (staged) {
            await diffStagedVsHead(repoPath);
        } else if (commits && commits.length === 2) {
            await diffCommits(commits[0], commits[1], repoPath);
        } else if (commits && commits.length === 1) {
            await diffWorkingVsCommit(commits[0], repoPath);
        } else {
            await diffWorkingVsStaged(repoPath);
        }
    } catch (error) {
        console.error(chalk.red("Error in diff command:", error.message));
    }
}


async function diffWorkingVsStaged(repoPath) {
    const index = await readIndex(repoPath);
    let hasChanges = false;

    for (const [file, fileInfo] of Object.entries(index)) {
        const filePath = path.join(process.cwd(), file);

        try {
            const currentContent = await fs.readFile(filePath, "utf-8");
            const stagedContentBuffer = await readObjectContent(fileInfo.hash, repoPath);

            if (stagedContentBuffer === null || stagedContentBuffer === undefined) {
                console.log(chalk.yellow(`Warning: Could not read staged content for ${file}`));
                continue;
            }

            const stagedContent = bufferToString(stagedContentBuffer);
            if (currentContent !== stagedContent) {
                hasChanges = true;
                console.log(generateUnifiedDiff(stagedContent, currentContent, file));
                console.log();
            }
        } catch (error) {
            hasChanges = true;
            const stagedContentBuffer = await readObjectContent(fileInfo.hash, repoPath);
            const stagedContent = bufferToString(stagedContentBuffer);
            console.log(generateUnifiedDiff(stagedContent, "", file));
            console.log();
        }
    }

    if (!hasChanges) {
        console.log(chalk.gray("No changes in working tree"));
    }
}


async function diffStagedVsHead(repoPath) {
    const index = await readIndex(repoPath);
    const currentCommit = await getCurrentCommit(repoPath);

    if (!currentCommit) {
        console.log(chalk.yellow("No commits yet - showing all staged files as new"));

        for (const [file, fileInfo] of Object.entries(index)) {
            const stagedContentBuffer = await readObjectContent(fileInfo.hash, repoPath);
            const stagedContent = bufferToString(stagedContentBuffer);
            console.log(generateUnifiedDiff("", stagedContent, file));
            console.log();
        }
        return;
    }

    const headTree = await getCommitTree(currentCommit, repoPath);
    let hasChanges = false;

    for (const [file, fileInfo] of Object.entries(index)) {
        const headFile = headTree[file];
        const stagedContentBuffer = await readObjectContent(fileInfo.hash, repoPath);
        const stagedContent = bufferToString(stagedContentBuffer);

        if (!headFile) {
            hasChanges = true;
            console.log(generateUnifiedDiff("", stagedContent, file));
            console.log();
        } else if (headFile.hash !== fileInfo.hash) {
            hasChanges = true;
            const headContentBuffer = await readObjectContent(headFile.hash, repoPath);
            const headContent = bufferToString(headContentBuffer);
            console.log(generateUnifiedDiff(headContent, stagedContent, file));
            console.log();
        }
    }

    for (const [file, fileInfo] of Object.entries(headTree)) {
        if (!index[file]) {
            hasChanges = true;
            const headContentBuffer = await readObjectContent(fileInfo.hash, repoPath);
            const headContent = bufferToString(headContentBuffer);
            console.log(generateUnifiedDiff(headContent, "", file));
            console.log();
        }
    }

    if (!hasChanges) {
        console.log(chalk.gray("No staged changes"));
    }
}


async function diffWorkingVsCommit(commitHash, repoPath) {
    const commitTree = await getCommitTree(commitHash, repoPath);
    const index = await readIndex(repoPath);
    let hasChanges = false;

    const allFiles = new Set([
        ...Object.keys(commitTree),
        ...Object.keys(index),
    ]);

    for (const file of allFiles) {
        const filePath = path.join(process.cwd(), file);
        const commitFile = commitTree[file];

        try {
            const workingContent = await fs.readFile(filePath, "utf-8");
            const commitContentBuffer = commitFile
                ? await readObjectContent(commitFile.hash, repoPath)
                : null;
            const commitContent = bufferToString(commitContentBuffer);

            if (workingContent !== commitContent) {
                hasChanges = true;
                console.log(generateUnifiedDiff(commitContent, workingContent, file));
                console.log();
            }
        } catch (error) {
            if (commitFile) {
                hasChanges = true;
                const commitContentBuffer = await readObjectContent(commitFile.hash, repoPath);
                const commitContent = bufferToString(commitContentBuffer);
                console.log(generateUnifiedDiff(commitContent, "", file));
                console.log();
            }
        }
    }

    if (!hasChanges) {
        console.log(chalk.gray("No changes"));
    }
}


async function diffCommits(commit1Hash, commit2Hash, repoPath) {
    const tree1 = await getCommitTree(commit1Hash, repoPath);
    const tree2 = await getCommitTree(commit2Hash, repoPath);
    let hasChanges = false;

    const allFiles = new Set([...Object.keys(tree1), ...Object.keys(tree2)]);

    for (const file of allFiles) {
        const file1 = tree1[file];
        const file2 = tree2[file];

        if (!file1) {
            hasChanges = true;
            const content2Buffer = await readObjectContent(file2.hash, repoPath);
            const content2 = bufferToString(content2Buffer);
            console.log(generateUnifiedDiff("", content2, file));
            console.log();
        } else if (!file2) {
            hasChanges = true;
            const content1Buffer = await readObjectContent(file1.hash, repoPath);
            const content1 = bufferToString(content1Buffer);
            console.log(generateUnifiedDiff(content1, "", file));
            console.log();
        } else if (file1.hash !== file2.hash) {
            hasChanges = true;
            const content1Buffer = await readObjectContent(file1.hash, repoPath);
            const content2Buffer = await readObjectContent(file2.hash, repoPath);
            const content1 = bufferToString(content1Buffer);
            const content2 = bufferToString(content2Buffer);
            console.log(generateUnifiedDiff(content1, content2, file));
            console.log();
        }
    }

    if (!hasChanges) {
        console.log(chalk.gray("No changes between commits"));
    }
}

module.exports = { diff };
