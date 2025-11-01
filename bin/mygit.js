const { program } = require("commander");
const chalk = require("chalk");

// Import commands (will be created later)
// const init = require('../src/commands/init');
// const add = require('../src/commands/add');
// const commit = require('../src/commands/commit');

program
  .name("mygit")
  .description("A simple Git-like version control system")
  .version("1.0.0");

// Init command
program
  .command("init")
  .description("Initialize a new repository")
  .action(() => {
    console.log(chalk.green("Initialized empty MyGit repository"));
    // init.execute();
  });

// Add command
program
  .command("add ")
  .description("Add file to staging area")
  .action((file) => {
    console.log(chalk.blue(`Adding ${file}...`));
    // add.execute(file);
  });

// Status command
program
  .command("status")
  .description("Show the working tree status")
  .action(() => {
    console.log(chalk.yellow("On branch main"));
    // status.execute();
  });

// Commit command
program
  .command("commit")
  .description("Record changes to the repository")
  .option("-m, --message ", "Commit message")
  .action((options) => {
    if (!options.message) {
      console.log(chalk.red("Error: Please provide a commit message"));
      return;
    }
    console.log(chalk.green(`Committing: ${options.message}`));
    // commit.execute(options.message);
  });

// Log command
program
  .command("log")
  .description("Show commit logs")
  .action(() => {
    console.log(chalk.cyan("Commit history:"));
    // log.execute();
  });

program.parse(process.argv);
