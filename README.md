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

## Mock Exam Mode

Practice on real past UZH exam questions extracted from PDF files.

1. Place past exam PDFs in `Old_Excames/`
   - Naming: `FinalExam2022.pdf`, `Solution2022.pdf` (years 2022–2024)
2. Run `npm run parse` once to generate `Mock_Exam/questions.json`
3. Start the server: `npm start`
4. Open **http://localhost:3000/exam** or click **Mock Exam →** in the main tool

Features: random or specific question mode, per-question timer, C code editor + terminal, side-by-side solution comparison, and `.c` file download with your notes.

---

## Lecture Exercises Mode

Practice custom exercises generated from lecture slides (e.g. via NotebookLM).

1. Create `exercises.json` in the project root
2. Paste in your exercises as a JSON array — each entry has these fields:

```json
{
  "id": 1,
  "lecture": "sl01",
  "chapter": 3,
  "chapterName": "Sorting",
  "title": "Bubble Sort",
  "difficulty": "easy",
  "type": "c_code",
  "recMinutes": 10,
  "questionText": "...",
  "solutionText": ""
}
```

- `difficulty`: `"easy"`, `"hard"`, or `"single"`
- `type`: `"c_code"`, `"pseudocode"`, `"both"`, or `"open"`
- Two-part chapters → two entries (one `easy`, one `hard`)
- `exercises.json` is gitignored — stays local only

3. Start the server: `npm start`
4. Open **http://localhost:3000/exercises** or click **Exercises →** in the main tool

---

## Features

- **Exercise bar** — label your current task
- **General Thoughts** — freeform notes textarea
- **Pseudocode** — plan your solution
- **C Code editor** — CodeMirror with Monokai theme, line numbers, active-line highlight, and squiggly error/warning underlines from gcc
- **Terminal** — run your code with selectable compiler (gcc or clang, Standard/Strict/Debug)
- **Download** — export a `.c` file with your notes as a header comment
