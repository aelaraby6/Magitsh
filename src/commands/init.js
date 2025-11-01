const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

async function execute() {
  try {
    const mygitPath = path.join(process.cwd(), '.mygit');
    
    // Check if already initialized
    try {
      await fs.access(mygitPath);
      console.log(chalk.yellow('Repository already initialized'));
      return;
    } catch (err) {
      // Directory doesn't exist, continue
    }
    
    // Create .mygit directory structure
    await fs.mkdir(mygitPath);
    await fs.mkdir(path.join(mygitPath, 'objects'));
    await fs.mkdir(path.join(mygitPath, 'refs'));
    await fs.mkdir(path.join(mygitPath, 'refs', 'heads'));
    
    // Create HEAD file
    await fs.writeFile(
      path.join(mygitPath, 'HEAD'),
      'ref: refs/heads/main\n'
    );
    
    console.log(chalk.green('✓ Initialized empty MyGit repository in .mygit/'));
  } catch (error) {
    console.error(chalk.red('Error initializing repository:'), error.message);
  }
}

module.exports = { execute };