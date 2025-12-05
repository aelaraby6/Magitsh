# Magitsh

Ever wondered how Git actually works? **magitsh** is a fully functional Git implementation built with Node.js. No magic, just clean code you can read and understand.

## ✨ Features

- **Real Git Objects** - Implements blobs, trees, and commits with SHA-1 hashing and zlib compression
- **Async File System** - Built on Node.js fs/promises for efficient non-blocking file operations and recursive directory handling
- **Graph Algorithms** - Uses DAG data structures with BFS traversal for commit history and merge base detection
- **Smart Merging** - Three-way merge algorithm with automatic conflict detection and resolution
- **Complete CLI** - All essential Git commands: init, add, commit, branch, checkout, merge, diff, log, status
- **Production Ready** - Published on npm with full test coverage using Jest

<img width="1280" height="570" alt="image" src="https://github.com/user-attachments/assets/9966f6d6-c8bc-4a5b-826d-44ea530c6d33" />

---

<img width="1280" height="712" alt="image" src="https://github.com/user-attachments/assets/3851e92a-1f2a-4495-b995-6988896400a6" />

---

<img width="1256" height="501" alt="image" src="https://github.com/user-attachments/assets/91a79156-39f1-4639-b34e-16e2a6942013" />


## 🎯 Commands

```bash
magitsh init              # Initialize repository
magitsh add <files>       # Stage files
magitsh commit -m "msg"   # Create commit
magitsh status            # Check status
magitsh log               # View history
magitsh branch            # List branches
magitsh checkout <branch> # Switch branches
magitsh checkout -b <br>  # Create new branch
magitsh merge <branch>    # Merge branches
magitsh diff              # Show changes
```

## 🏗️ How It Works

### Repository Structure

```
.magitsh/
├── objects/           # Content-addressed storage
│   ├── [ab]/[cdef]   # Blobs, trees, commits (SHA-1 based)
│   ├── info/
│   └── pack/
├── refs/
│   ├── heads/        # Branch pointers
│   └── tags/         # Tag references
├── hooks/            # Hook samples
│   ├── pre-commit.sample
│   └── commit-msg.sample
├── info/
│   └── exclude       # Gitignore patterns
├── HEAD              # Current branch (ref: refs/heads/main)
├── index.json        # Staging area
├── config            # Repository config
└── description       # Repository description
```

### Core Concepts

**Objects**: Everything is stored as content-addressed objects
- **Blobs**: File contents (compressed with zlib)
- **Trees**: Directory structures (mode + name + hash)
- **Commits**: Snapshots with parent pointers (supports multiple parents)

**DAG (Graph)**: Commits form a directed acyclic graph
- BFS traversal for finding lowest common ancestor
- Distance tracking for merge base detection
- Topological ordering for commit history

**Branches**: Lightweight references to commits
- Stored as text files in `refs/heads/`
- HEAD points to current branch
- Branch validation ensures safe names

## 🛠️ Built With

- **Node.js** - Runtime environment
- **Commander.js** - CLI argument parsing
- **Chalk** - Terminal styling and colors
- **Jest** - Testing framework
- **zlib** - Compression (deflate/inflate)
- **crypto** - SHA-1 hashing
- **fs/promises** - Async file operations


## 🎯 Key Algorithms

### Three-Way Merge
```
Base (LCA)     Current (HEAD)    Incoming (feature)
    |               |                    |
    └───────────────┴────────────────────┘
                    ↓
         Conflict Detection:
         • modify-modify: Both changed differently
         • add-add: Both added different content
         • delete-modify: Deleted vs modified
         • modify-delete: Modified vs deleted
                    ↓
         Auto-merge clean changes
                    ↓
         Create conflict markers for conflicts
```

### Lowest Common Ancestor (LCA)
```javascript
// BFS from both commits simultaneously
const ancestors1 = getAncestorsWithDistance(commit1);
const ancestors2 = getAncestorsWithDistance(commit2);

// Find common ancestors
const common = findIntersection(ancestors1, ancestors2);

// Select LCA with minimum total distance
return common.sort((a, b) => 
  (a.dist1 + a.dist2) - (b.dist1 + b.dist2)
)[0];
```

### Installation

```bash
npm install -g magitsh
```

## 🧪 Testing

```bash
npm test
```

<img width="1280" height="567" alt="image" src="https://github.com/user-attachments/assets/b7bded45-f30c-4a19-aa07-d72a44c21f18" />



## 👥 Contributors

Thanks goes to these wonderful people in the team:

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/aelaraby6">
        <img src="https://avatars.githubusercontent.com/u/154278999?v=4" width="100px;" alt=""/>
        <br /><sub><b>Abdelrahman Elaraby</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/Zeyadzahran">
        <img src="https://avatars.githubusercontent.com/u/155586428?v=4" width="100px;" alt=""/>
        <br /><sub><b>Zeyad Zahran</b></sub>
      </a>
    </td>
  </tr>
</table>
