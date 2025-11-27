const fs = require("fs").promises;
const path = require("path");
const chalk = require("chalk");
const {
  createConfigFile,
  createDescriptionFile,
  createHeadFile,
  createDirectoryStructure,
  createHooksSamples,
  createInfoExclude,
} = require("../utils/init.helpers");

async function init() {
  try {
    const mygitPath = path.join(process.cwd(), ".mygit");

    // Check if already initialized
    try {
      await fs.access(mygitPath);
      console.log(chalk.yellow("Repository already initialized"));
      return;
    } catch (err) {
      await createDirectoryStructure(mygitPath);
      await createConfigFile(mygitPath);
      await createDescriptionFile(mygitPath);
      await createHeadFile(mygitPath);
      await createHooksSamples(mygitPath);
      await createInfoExclude(mygitPath);

      console.log(chalk.green("Initialized empty MyGit repository in .mygit/"));
    }
  } catch (error) {
    console.error(chalk.red("Error initializing repository:"), error.message);
  }
}

module.exports = { init };
