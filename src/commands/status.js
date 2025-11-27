const fs = require("fs").promises;
const path = require("path");
const chalk = require("chalk");
const { ensureMyGit, readIndex } = require("../utils/files");
const { sha1 } = require("../utils/hash");
const { getWorkingFiles } = require("../utils/getWorkFiles");

async function status() {
    try {
        const repoPath = await ensureMyGit();
        const index = await readIndex(repoPath);

        const headPath = path.join(repoPath, "HEAD");
        let currentBranch = "main";
        try {
            const headContent = await fs.readFile(headPath, "utf-8");
            const match = headContent.match(/ref: refs\/heads\/(.+)/);
            if (match) {
                currentBranch = match[1].trim();
            }
        } catch {
            // Default to main if HEAD doesn't exist
        }

        console.log(chalk.cyan(`On branch ${currentBranch}`));
        console.log();

        
        const workingFiles = await getWorkingFiles(process.cwd());

        const staged = [];
        const modified = [];
        const deleted = [];
        const untracked = [];

        for (const [file, fileInfo] of Object.entries(index)) {
            const filePath = path.join(process.cwd(), file);

            try {
                const content = await fs.readFile(filePath);
                const currentHash = sha1(content);
                const stat = await fs.stat(filePath);

                if (currentHash !== fileInfo.hash) {
                    // hash changed so file is modified
                    modified.push(file);
                } else {
                    // hash not changed so file is staged
                    staged.push(file);
                }
            } catch (error) {
                // File was staged but now deleted
                deleted.push(file);
            }
        }

        // untracked files
        for (const file of workingFiles) {
            if (!index[file]) {
                untracked.push(file);
            }
        }

        
        if (staged.length > 0) {
            console.log(chalk.green("Changes to be committed:"));
            console.log(chalk.gray("  (use \"mygit reset <file>...\" to unstage)"));
            console.log();
            for (const file of staged) {
                console.log(chalk.green(`\tnew file:   ${file}`));
            }
            console.log();
        }

        if (modified.length > 0) {
            console.log(chalk.red("Changes not staged for commit:"));
            console.log(chalk.gray("  (use \"mygit add <file>...\" to update what will be committed)"));
            console.log();
            for (const file of modified) {
                console.log(chalk.red(`\tmodified:   ${file}`));
            }
            console.log();
        }

        if (deleted.length > 0) {
            console.log(chalk.red("Changes not staged for commit:"));
            console.log(chalk.gray("  (use \"mygit add <file>...\" to update what will be committed)"));
            console.log();
            for (const file of deleted) {
                console.log(chalk.red(`\tdeleted:    ${file}`));
            }
            console.log();
        }

        if (untracked.length > 0) {
            console.log(chalk.red("Untracked files:"));
            console.log(chalk.gray("  (use \"mygit add <file>...\" to include in what will be committed)"));
            console.log();
            for (const file of untracked) {
                console.log(chalk.red(`\t${file}`));
            }
            console.log();
        }

        if (staged.length === 0 && modified.length === 0 && deleted.length === 0 && untracked.length === 0) {
            console.log(chalk.gray("nothing to commit, working tree clean"));
        }

    } catch (error) {
        console.error(chalk.red("Error in status command:", error.message));
    }
}


module.exports = { status };
