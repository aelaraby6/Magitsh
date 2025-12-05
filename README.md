# Magitsh 🔮

A simple Git-like version control system built with Node.js for learning and educational purposes.

[![npm version](https://badge.fury.io/js/magitsh.svg)](https://www.npmjs.com/package/magitsh)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install -g magitsh
```

## Usage

### Initialize a repository

```bash
magitsh init
```

### Add files to staging area

```bash
magitsh add <file>        # Add specific file
magitsh add file1 file2   # Add multiple files
magitsh add .             # Add all files
```

### Check status

```bash
magitsh status
```

### Commit changes

```bash
magitsh commit -m "Your commit message"
```

### View commit history

```bash
magitsh log
```

### Branch operations

```bash
magitsh branch              # List all branches
magitsh checkout <branch>   # Switch to a branch
magitsh checkout -b <name>  # Create and switch to new branch
```

### Merge branches

```bash
magitsh merge <branch>
```

### View differences

```bash
magitsh diff                      # Working tree vs staged
magitsh diff --staged             # Staged vs HEAD
magitsh diff <commit>             # Working tree vs commit
magitsh diff <commit1> <commit2>  # Between two commits
```

## Features

- ✅ Repository initialization (`.magitsh` directory)
- ✅ File staging with content hashing (SHA-1)
- ✅ Commit creation with tree objects
- ✅ Commit history (log)
- ✅ Branch creation and switching
- ✅ Merge with conflict detection (fast-forward & three-way)
- ✅ Diff viewing (multiple modes)
- ✅ Zlib compression for objects

## How It Works

Magitsh stores data in a `.magitsh` directory with the following structure:

```
.magitsh/
├── HEAD              # Points to current branch
├── config            # Repository configuration
├── description       # Repository description
├── hooks/            # Git hooks (samples)
├── index.json        # Staging area
├── info/
│   └── exclude       # Ignore patterns
├── objects/          # Content-addressable storage
│   ├── <dir>/        # First 2 chars of hash
│   │   └── <file>    # Remaining 38 chars (compressed)
│   ├── info/
│   └── pack/
└── refs/
    ├── heads/        # Branch references
    └── tags/         # Tag references
```

## Development

```bash
# Clone the repository
git clone https://github.com/aelaraby6/Magitsh.git
cd Magitsh

# Install dependencies
npm install

# Run tests
npm test

# Run the CLI locally
node bin/magitsh.js <command>
```

## License

MIT © [aelaraby6](https://github.com/aelaraby6)
