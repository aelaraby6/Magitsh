const fs = require("fs").promises;
const path = require("path");
const chalk = require("chalk");
const { readCommitObject } = require("./parse");
const { sha1 } = require("./hash");


/**
 * Find (LCA) btw commit1 and commit2  using BFS
 * Handles DAGs with multiple parents 
 */
async function findCommonAncestor(commit1Hash, commit2Hash, repoPath) {
    // Get all ancestors with their distances from both commits

    const ancestors1 = await getAncestorsWithDistance(commit1Hash, repoPath);
    const ancestors2 = await getAncestorsWithDistance(commit2Hash, repoPath);

    // Find common ancestors
    const commonAncestors = [];
    for (const [hash, dist1] of ancestors1.entries()) {
        if (ancestors2.has(hash)) {
            const dist2 = ancestors2.get(hash);
            commonAncestors.push({
                hash,
                totalDistance: dist1 + dist2,
                dist1,
                dist2
            });
        }
    }

    if (commonAncestors.length === 0) {
        return null;
    }

    commonAncestors.sort((a, b) => a.totalDistance - b.totalDistance);

    return commonAncestors[0].hash;
}

/**
 * Get all ancestors using BFS with distance tracking
 * Handles multiple parents (merge commits) in DAG
 * return a map with each node and its distance from the starting commit
 */
async function getAncestorsWithDistance(commitHash, repoPath) {
    const ancestors = new Map();
    const visited = new Set();
    const queue = [];

    queue.push({ hash: commitHash, distance: 0 });
    visited.add(commitHash);
    ancestors.set(commitHash, 0);

    let head = 0;

    while (head < queue.length) {
        const { hash, distance } = queue[head++];

        const commitData = await readCommitObject(hash, repoPath);
        if (!commitData) continue;

        for (const parent of commitData.parents || []) {
            if (!visited.has(parent)) {
                visited.add(parent);
                ancestors.set(parent, distance + 1);
                queue.push({ hash: parent, distance: distance + 1 });
            }
        }
    }

    return ancestors;
}

/**
 * Get ancestors in topological order 
 */
async function getAncestors(commitHash, repoPath) {
    const ancestors = [];
    const queue = [commitHash];
    const visited = new Set();

    visited.add(commitHash);

    let head = 0;

    while (head < queue.length) {
        const current = queue[head++];

        ancestors.push(current);

        const commitData = await readCommitObject(current, repoPath);
        if (!commitData) {
            continue;
        }

        const parents = commitData.parents || [];
        for (const parentHash of parents) {
            if (!visited.has(parentHash)) {
                visited.add(parentHash);
                queue.push(parentHash);
            }
        }
    }

    return ancestors;
}


async function getCommitTree(commitHash, repoPath) {
    const commitData = await readCommitObject(commitHash, repoPath);
    if (!commitData) {
        return {};
    }

    const treeHash = commitData.tree;
    const tree = await readTreeObject(treeHash, repoPath);
    return tree;
}


async function readTreeObject(treeHash, repoPath) {
    const zlib = require("zlib");

    try {
        const dir = treeHash.substring(0, 2);
        const file = treeHash.substring(2);
        const treePath = path.join(repoPath, "objects", dir, file);

        const compressed = await fs.readFile(treePath);
        const decompressed = zlib.inflateSync(compressed);

        const nullIndex = decompressed.indexOf(0);
        const content = decompressed.slice(nullIndex + 1);

        const fileMap = {};
        let offset = 0;

        while (offset < content.length) {
            const spaceIndex = content.indexOf(0x20, offset); // space
            const mode = content.slice(offset, spaceIndex).toString();

            const nullIndex = content.indexOf(0, spaceIndex + 1);
            const name = content.slice(spaceIndex + 1, nullIndex).toString();

            const hash = content.slice(nullIndex + 1, nullIndex + 21).toString('hex');

            if (mode === '100644') {
                fileMap[name] = { hash, mode };
            } else if (mode === '040000') {
                const subTree = await readTreeObject(hash, repoPath);
                for (const [subName, subInfo] of Object.entries(subTree)) {
                    fileMap[`${name}/${subName}`] = subInfo;
                }
            }

            offset = nullIndex + 21;
        }

        return fileMap;
    } catch (error) {
        return {};
    }
}


async function readObjectContent(hash, repoPath) {
    const zlib = require("zlib");

    try {
        const dir = hash.substring(0, 2);
        const file = hash.substring(2);
        const objectPath = path.join(repoPath, "objects", dir, file);

        const compressed = await fs.readFile(objectPath);
        const decompressed = zlib.inflateSync(compressed);

        const nullIndex = decompressed.indexOf(0);
        return decompressed.slice(nullIndex + 1); // Buffer of content
    } catch (error) {
        return null;
    }
}

async function detectConflicts(currentTree, incomingTree, baseTree, repoPath) {
    const conflicts = [];
    const allFiles = new Set([
        ...Object.keys(currentTree),
        ...Object.keys(incomingTree),
    ]);

    for (const file of allFiles) {
        const currentHash = currentTree[file]?.hash;
        const incomingHash = incomingTree[file]?.hash;
        const baseHash = baseTree[file]?.hash;

        if (
            currentHash &&
            incomingHash &&
            currentHash !== incomingHash &&
            baseHash &&
            currentHash !== baseHash &&
            incomingHash !== baseHash
        ) {
            conflicts.push({
                file,
                type: "modify-modify",
                currentHash,
                incomingHash,
                baseHash,
            });
        }
        else if (currentHash && incomingHash && !baseHash && currentHash !== incomingHash) {
            // add-add conflict: both branches added same file with different content
            conflicts.push({
                file,
                type: "add-add",
                currentHash,
                incomingHash,
            });
        }
        else if (!currentHash && incomingHash && baseHash && incomingHash !== baseHash) {
            conflicts.push({
                file,
                type: "delete-modify",
                incomingHash,
                baseHash,
            });
        } else if (currentHash && !incomingHash && baseHash && currentHash !== baseHash) {
            conflicts.push({
                file,
                type: "modify-delete",
                currentHash,
                baseHash,
            });
        }
    }

    return conflicts;
}


async function createConflictFile(file, currentHash, incomingHash, repoPath) {
    let currentContent = "";
    let incomingContent = "";

    if (currentHash) {
        const content = await readObjectContent(currentHash, repoPath);
        currentContent = content ? content.toString() : "";
    }

    if (incomingHash) {
        const content = await readObjectContent(incomingHash, repoPath);
        incomingContent = content ? content.toString() : "";
    }

    const conflictContent =
        `<<<<<<< HEAD
${currentContent}=======
${incomingContent}>>>>>>> incoming
`;

    const filePath = path.join(process.cwd(), file);
    await fs.writeFile(filePath, conflictContent);
}


async function applyMergeChanges(currentTree, incomingTree, baseTree, repoPath) {
    const changes = {
        added: [],
        modified: [],
        deleted: [],
    };

    const allFiles = new Set([
        ...Object.keys(incomingTree),
        ...Object.keys(currentTree),
    ]);

    for (const file of allFiles) {
        const currentHash = currentTree[file]?.hash;
        const incomingHash = incomingTree[file]?.hash;
        const baseHash = baseTree[file]?.hash;

        if (incomingHash && !baseHash && !currentHash) {
            const content = await readObjectContent(incomingHash, repoPath);
            const filePath = path.join(process.cwd(), file);
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, content);
            changes.added.push(file);
        }
        else if (incomingHash && baseHash && incomingHash !== baseHash && currentHash === baseHash) {
            const content = await readObjectContent(incomingHash, repoPath);
            const filePath = path.join(process.cwd(), file);
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, content);
            changes.modified.push(file);
        }
        else if (!incomingHash && baseHash && currentHash === baseHash) {
            const filePath = path.join(process.cwd(), file);
            try {
                await fs.unlink(filePath);
                changes.deleted.push(file);
            } catch {
            }
        }
    }

    return changes;
}


async function isFastForward(currentHash, incomingHash, repoPath) {
    const incomingAncestors = await getAncestors(incomingHash, repoPath);
    return incomingAncestors.includes(currentHash);
}


async function fastForwardMerge(repoPath, branchRef, incomingHash) {
    const branchPath = path.join(repoPath, branchRef);
    await fs.writeFile(branchPath, incomingHash + "\n");
    return true;
}

module.exports = {
    findCommonAncestor,
    getCommitTree,
    detectConflicts,
    createConflictFile,
    applyMergeChanges,
    isFastForward,
    fastForwardMerge,
    readObjectContent,
    getAncestors,
    getAncestorsWithDistance,
};
