const express = require('express');
const { exec, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const TMP_SRC = path.join(os.tmpdir(), 'user_code.c');
const TMP_BIN = path.join(os.tmpdir(), 'user_out' + (process.platform === 'win32' ? '.exe' : ''));

// Cache: skip recompilation if code+flags are unchanged
let lastHash = null;
let lastErrors = [];

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

function parseErrors(stderr, srcPath) {
  const errors = [];
  const escaped = srcPath.replace(/\\/g, '\\\\').replace(/\./g, '\\.').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  // gcc/clang: /path/file.c:LINE:COL: error: MESSAGE
  const gccPat = new RegExp(`(?:${escaped}|user_code\\.c):(\\d+):\\d+:\\s+(error|warning):\\s+(.+)`, 'g');
  // tcc: /path/file.c:LINE: error: MESSAGE  (no column)
  const tccPat = new RegExp(`(?:${escaped}|user_code\\.c):(\\d+):\\s+(error|warning):\\s+(.+)`, 'g');

  let match;
  const seen = new Set();
  for (const pat of [gccPat, tccPat]) {
    while ((match = pat.exec(stderr)) !== null) {
      const key = `${match[1]}:${match[3]}`;
      if (!seen.has(key)) {
        seen.add(key);
        errors.push({ line: parseInt(match[1], 10), type: match[2], message: match[3].trim() });
      }
    }
  }
  return errors;
}

function runBinary(res, errors) {
  execFile(TMP_BIN, [], { timeout: 5000 }, (runErr, runStdout, runStderr) => {
    const output = runStdout + (runStderr || '');
    const exitCode = runErr ? (runErr.killed ? 124 : (runErr.code || 1)) : 0;
    res.json({ success: true, output, exitCode, errors });
  });
}

app.post('/run', (req, res) => {
  const { code, compiler, flags } = req.body;

  if (typeof code !== 'string') {
    return res.status(400).json({ success: false, output: 'No code provided.', exitCode: 1, errors: [] });
  }

  const useTCC = compiler === 'tcc';
  const safeFlags = useTCC ? '' : (flags || '-Wall -Wextra').replace(/[;&|`$(){}]/g, '');
  const hash = crypto.createHash('sha1').update(code + '\0' + (compiler || 'gcc') + '\0' + safeFlags).digest('hex');

  // Skip recompilation if nothing changed
  if (hash === lastHash && fs.existsSync(TMP_BIN)) {
    return runBinary(res, lastErrors);
  }

  fs.writeFileSync(TMP_SRC, code, 'utf8');

  const compilerBin = useTCC ? 'tcc' : 'gcc';
  const compileCmd = useTCC
    ? `tcc "${TMP_SRC}" -o "${TMP_BIN}"`
    : `gcc "${TMP_SRC}" -o "${TMP_BIN}" ${safeFlags}`;

  exec(compileCmd, { timeout: 15000 }, (compileErr, compileStdout, compileStderr) => {
    const gccOutput = compileStderr || compileStdout || '';
    const errors = parseErrors(gccOutput, TMP_SRC);

    if (compileErr) {
      lastHash = null;
      return res.json({ success: false, output: gccOutput, exitCode: compileErr.code || 1, errors });
    }

    lastHash = hash;
    lastErrors = errors;
    runBinary(res, errors);
  });
});

app.get('/exam', (req, res) => {
  res.sendFile(path.join(__dirname, 'Mock_Exam', 'exam.html'));
});

app.get('/api/questions', (req, res) => {
  const qPath = path.join(__dirname, 'Mock_Exam', 'questions.json');
  if (!fs.existsSync(qPath)) {
    return res.status(404).json({ error: 'questions.json not found. Run: npm run parse' });
  }
  res.sendFile(qPath);
});

app.get('/exercises', (req, res) => {
  res.sendFile(path.join(__dirname, 'exercises.html'));
});

app.get('/api/exercises', (req, res) => {
  const ePath = path.join(__dirname, 'exercises.json');
  if (!fs.existsSync(ePath)) {
    return res.status(404).json({ error: 'exercises.json not found.' });
  }
  res.sendFile(ePath);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`C runner listening at http://localhost:${PORT}`);
  console.log(`Mock Exam at http://localhost:${PORT}/exam`);
  console.log(`Exercises at http://localhost:${PORT}/exercises`);
});
