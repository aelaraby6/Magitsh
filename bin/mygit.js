#!/usr/bin/env node

const { program } = require("commander");
const chalk = require("chalk");
const { init } = require("../src/commands/init");
const { add } = require("../src/commands/add");
const { status } = require("../src/commands/status");
const { commit } = require("../src/commands/add");
const { log } = require("../src/commands/log");

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
      add(files);
    } catch (error) {
      console.error(chalk.red("Error:", error.message));
      process.exit(1);
    }
  });

// Status command
program
  .command("status")
  .description("Show the working tree status")
  .action(async () => {
    try {
      await status();
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
  .action(async (options) => {
    try {
      if (!options.message) {
        console.log(
          chalk.red("Error: Please provide a commit message using -m flag")
        );
        console.log(chalk.gray("Example: mygit commit -m 'Your message'"));
        process.exit(1);
      }
      await commit(options.message);
    } catch (error) {
      console.error(chalk.red("Error:", error.message));
      process.exit(1);
    }
  });

// Log command
program
  .command("log")
  .description("Show commit logs")
  .action(async () => {
    try {
      console.log(chalk.cyan("Commit history:"));
      await log();
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
