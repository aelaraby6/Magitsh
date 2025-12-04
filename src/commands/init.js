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
    const magitshPath = path.join(process.cwd(), ".magitsh");

    // Check if already initialized
    try {
      await fs.access(magitshPath);
      console.log(chalk.yellow("Repository already initialized"));
      return;
    } catch (err) {
      await createDirectoryStructure(magitshPath);
      await createConfigFile(magitshPath);
      await createDescriptionFile(magitshPath);
      await createHeadFile(magitshPath);
      await createHooksSamples(magitshPath);
      await createInfoExclude(magitshPath);

      console.log(chalk.green("Initialized empty Magitsh repository in .magitsh/"));
    }
  } catch (error) {
    console.error(chalk.red("Error initializing repository:"), error.message);
  }
}

module.exports = { init };
