const fs = require("fs").promises;
const path = require("path");

async function getWorkingFiles(dir, fileList = [], baseDir = dir) {
    const files = await fs.readdir(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);

        if (file === ".magitsh" || file === "node_modules" || file === ".git") {
            continue;
        }

        if (stat.isDirectory()) {
            await getWorkingFiles(filePath, fileList, baseDir);
        } else {
            const relativePath = path.relative(baseDir, filePath);
            fileList.push(relativePath);
        }
    }

    return fileList;
}
module.exports = { getWorkingFiles };