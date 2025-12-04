const chalk = require("chalk");

function generateUnifiedDiff(oldContent, newContent, fileName) {
    const oldLines = oldContent.split("\n");
    const newLines = newContent.split("\n");
    const contextLines = 3;

    const diff = [];

    diff.push(chalk.bold(`diff --git a/${fileName} b/${fileName}`));
    diff.push(chalk.bold(`--- a/${fileName}`));
    diff.push(chalk.bold(`+++ b/${fileName}`));

    const changes = [];
    const maxLen = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLen; i++) {
        if (oldLines[i] !== newLines[i]) {
            changes.push(i);
        }
    }

    if (changes.length === 0) {
        return diff.join("\n");
    }

    const hunks = [];
    let currentHunk = null;

    for (const changeIdx of changes) {
        if (!currentHunk || changeIdx > currentHunk.end + contextLines * 2) {
            if (currentHunk) {
                hunks.push(currentHunk);
            }
            currentHunk = {
                start: Math.max(0, changeIdx - contextLines),
                end: Math.min(maxLen - 1, changeIdx + contextLines),
            };
        } else {
            currentHunk.end = Math.min(maxLen - 1, changeIdx + contextLines);
        }
    }

    if (currentHunk) {
        hunks.push(currentHunk);
    }

    for (const hunk of hunks) {
        const hunkLines = [];
        let oldCount = 0;
        let newCount = 0;

        for (let i = hunk.start; i <= hunk.end; i++) {
            const oldLine = oldLines[i];
            const newLine = newLines[i];

            if (oldLine === newLine && oldLine !== undefined) {
                hunkLines.push(" " + oldLine);
                oldCount++;
                newCount++;
            } else {
                if (oldLine !== undefined) {
                    hunkLines.push(chalk.red("-" + oldLine));
                    oldCount++;
                }
                if (newLine !== undefined) {
                    hunkLines.push(chalk.green("+" + newLine));
                    newCount++;
                }
            }
        }

        diff.push(chalk.cyan(`@@ -${hunk.start + 1},${oldCount} +${hunk.start + 1},${newCount} @@`));
        diff.push(...hunkLines);
    }

    return diff.join("\n");
}

function calculateDiff(oldLines, newLines) {
    const n = oldLines.length;
    const m = newLines.length;
    const max = n + m;
    const v = { 1: 0 };
    const trace = [];

    for (let d = 0; d <= max; d++) {
        trace.push({ ...v });

        for (let k = -d; k <= d; k += 2) {
            let x;
            if (k === -d || (k !== d && v[k - 1] < v[k + 1])) {
                x = v[k + 1];
            } else {
                x = v[k - 1] + 1;
            }

            let y = x - k;

            while (x < n && y < m && oldLines[x] === newLines[y]) {
                x++;
                y++;
            }

            v[k] = x;

            if (x >= n && y >= m) {
                return backtrack(trace, oldLines, newLines, d);
            }
        }
    }

    return [];
}


function backtrack(trace, oldLines, newLines, d) {
    const diff = [];
    let x = oldLines.length;
    let y = newLines.length;

    for (let i = d; i >= 0; i--) {
        const v = trace[i];
        const k = x - y;

        let prevK;
        if (k === -i || (k !== i && v[k - 1] < v[k + 1])) {
            prevK = k + 1;
        } else {
            prevK = k - 1;
        }

        const prevX = v[prevK];
        const prevY = prevX - prevK;

        while (x > prevX && y > prevY) {
            diff.unshift({ type: 'equal', oldIndex: x - 1, newIndex: y - 1, line: oldLines[x - 1] });
            x--;
            y--;
        }

        if (i > 0) {
            if (x === prevX) {
                diff.unshift({ type: 'insert', newIndex: y - 1, line: newLines[y - 1] });
                y--;
            } else {
                diff.unshift({ type: 'delete', oldIndex: x - 1, line: oldLines[x - 1] });
                x--;
            }
        }
    }

    return diff;
}


function formatDiff(diffOps, fileName, contextLines = 3) {
    const output = [];

    output.push(chalk.bold(`diff --git a/${fileName} b/${fileName}`));
    output.push(chalk.bold(`--- a/${fileName}`));
    output.push(chalk.bold(`+++ b/${fileName}`));

    let i = 0;
    while (i < diffOps.length) {
        while (i < diffOps.length && diffOps[i].type === 'equal') {
            i++;
        }

        if (i >= diffOps.length) break;

        const hunkStart = Math.max(0, i - contextLines);
        const hunkLines = [];

        for (let j = hunkStart; j < i; j++) {
            if (diffOps[j].type === 'equal') {
                hunkLines.push(" " + diffOps[j].line);
            }
        }

        let oldCount = 0;
        let newCount = 0;
        let changeStart = i;

        while (i < diffOps.length && (diffOps[i].type !== 'equal' || i - changeStart < contextLines * 2)) {
            const op = diffOps[i];

            if (op.type === 'delete') {
                hunkLines.push(chalk.red("-" + op.line));
                oldCount++;
            } else if (op.type === 'insert') {
                hunkLines.push(chalk.green("+" + op.line));
                newCount++;
            } else {
                hunkLines.push(" " + op.line);
                oldCount++;
                newCount++;
            }

            i++;
        }

        const oldStart = (diffOps[hunkStart]?.oldIndex || 0) + 1;
        const newStart = (diffOps[hunkStart]?.newIndex || 0) + 1;
        output.push(chalk.cyan(`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`));
        output.push(...hunkLines);
    }

    return output.join("\n");
}

module.exports = {
    generateUnifiedDiff,
    calculateDiff,
    formatDiff,
};
