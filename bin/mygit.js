#!/usr/bin/env node

const { program } = require("commander");
const chalk = require("chalk");
const { init } = require("../src/commands/init");

program
  .name("mygit")
  .description("A simple Git-like version control system")
  .version("1.0.0");

// Init command
program
  .command("init")
  .description("Initialize a new repository")
  .action(async () => {
    try {
      await init();
    } catch (error) {
      console.error(chalk.red("Error:", error.message));
      process.exit(1);
    }
  });

// Add command
program
  .command("add <files...>")  
  .description("Add file(s) to staging area")
  .action((files) => {
    try {
      console.log(chalk.blue(`Adding ${files.join(", ")}...`));
      // TODO: add.execute(files);
    } catch (error) {
      console.error(chalk.red("Error:", error.message));
      process.exit(1);
    }
  });

// Status command
program
  .command("status")
  .description("Show the working tree status")
  .action(() => {
    try {
      console.log(chalk.yellow("On branch main"));
      // TODO: status.execute();
    } catch (error) {
      console.error(chalk.red("Error:", error.message));
      process.exit(1);
    }
  });

// Commit command
program
  .command("commit")
  .description("Record changes to the repository")
  .option("-m, --message <msg>", "Commit message")  
  .action((options) => {
    try {
      if (!options.message) {
        console.log(chalk.red("Error: Please provide a commit message using -m flag"));
        console.log(chalk.gray("Example: mygit commit -m 'Your message'"));
        process.exit(1);
      }
      console.log(chalk.green(`Committing: ${options.message}`));
      // TODO: commit.execute(options.message);
    } catch (error) {
      console.error(chalk.red("Error:", error.message));
      process.exit(1);
    }
  });

// Log command
program
  .command("log")
  .description("Show commit logs")
  .action(() => {
    try {
      console.log(chalk.cyan("Commit history:"));
      // TODO: log.execute();
    } catch (error) {
      console.error(chalk.red("Error:", error.message));
      process.exit(1);
    }
  });

// Show help if no command provided
if (process.argv.length === 2) {
  program.help();
}

program.parse(process.argv);