# 🔮 Magitsh — A Minimal Git Implementation for Learning Version Control

Magitsh is a lightweight, Git-like version control system built entirely with Node.js, created as an educational project to understand how Git works internally — object storage, commits, branches, diffs, merges, and more.

This project is built by:

- Zeyad Zahran — https://github.com/Zeyadzahran
- aelaraby6 — https://github.com/aelaraby6

We built this to demystify Git internals and give learners a minimal, functional VCS they can read, modify, and explore.

---

## 📦 Installation

```
npm install -g magitsh
```

---

## 🚀 Quick Start

### Initialize a repository

```
magitsh init
```

### Add files

```
magitsh add <file>          # Add a file
magitsh add file1 file2     # Add multiple files
magitsh add .               # Add everything
```

### Commit changes

```
magitsh commit -m "My first commit"
```

### View repository status

```
magitsh status
```

### View commit history

```
magitsh log
```

---

## 🌿 Branching

```
magitsh branch               # List branches
magitsh checkout <name>      # Switch branches
magitsh checkout -b <name>   # Create + switch
```

---

## 🔀 Merge Branches

```
magitsh merge <branch>
```

Supports:
- Fast-forward merges  
- Three-way merges  
- Conflict detection  

---

## 🧩 Diff Viewer

```
magitsh diff
magitsh diff --staged
magitsh diff <commit>
magitsh diff <commit1> <commit2>
```

---

# ⚙️ Features

- Repository initialization (`.magitsh`)
- Staging area with SHA-1 hashing
- Commit objects & tree structure
- Branching with HEAD management
- Commit history traversal (log)
- Merge engine (fast-forward + 3-way)
- Diff engine (working, staged, commit)
- Zlib compression for objects
- Fully file-system based VCS

---

# 🗂 Internal Structure

```
.magitsh/
├── HEAD
├── config
├── description
├── hooks/
├── index.json
├── info/
│   └── exclude
├── objects/
│   ├── xx/xxxx...      # Compressed objects
│   ├── info/
│   └── pack/
└── refs/
    ├── heads/
    └── tags/
```

---

# 🛠 Development

```
git clone https://github.com/aelaraby6/Magitsh.git
cd Magitsh

npm install
npm test

node bin/magitsh.js <command>
```

---

# 📜 License

MIT ©  aelaraby6

MIT © [Zeyad Zahran](https://github.com/Zeyadzahran) & [aelaraby6](https://github.com/aelaraby6)
