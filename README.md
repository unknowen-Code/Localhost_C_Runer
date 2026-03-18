# Localhost C Runner

A local browser-based C coding tool with syntax highlighting, gcc error annotations, and an integrated terminal.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- `gcc` installed and on your PATH (comes with MinGW / Git for Windows / MSYS2)

## Setup

```bash
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

---

## Optional: Clang (faster compilation + better error messages)

Clang is a drop-in replacement for gcc — same flags, noticeably faster on small files, and its error messages are clearer and more precise. Recommended for learning C.

### Installing Clang on Windows

```
winget install LLVM.LLVM
```

After installing, open a **new** terminal and verify:

```
clang -v
```

Once Clang is on your PATH, restart the server and select any **clang —** option from the compiler dropdown.

---

## Features

- **Exercise bar** — label your current task
- **General Thoughts** — freeform notes textarea
- **Pseudocode** — plan your solution
- **C Code editor** — CodeMirror with Monokai theme, line numbers, active-line highlight, and squiggly error/warning underlines from gcc
- **Terminal** — run your code with selectable compiler (gcc or clang, Standard/Strict/Debug)
- **Download** — export a `.c` file with your notes as a header comment
