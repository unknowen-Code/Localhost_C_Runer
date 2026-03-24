// parse_exams.js — run once with: npm run parse
// Reads exam and solution PDFs from Old_Excames/, extracts typed questions,
// saves results to Mock_Exam/questions.json

const fs      = require('fs');
const path    = require('path');
const pdfParse = require('pdf-parse');

const EXAMS_DIR = path.join(__dirname, '..', 'Old_Excames');
const OUT_FILE  = path.join(__dirname, 'questions.json');
const YEARS     = ['2022', '2023', '2024'];

// ── Classification patterns ───────────────────────────────────────────────

// C code questions
const C_CODE_PATTERNS = [
  /write\s+(a\s+)?C\s+(function|program|code|implementation)/i,
  /implement.{0,50}in\s+C\b/i,
  /\bC\s+function\b/i,
  /\bC\s+program\b/i,
  /complete\s+the\s+(following\s+)?C\b/i,
  /fill\s+in\s+the\s+C/i,
  /write\s+the\s+(code|function|program)/i,
  /code\s+in\s+C\b/i,
];

// Pseudocode questions
const PSEUDO_PATTERNS = [
  /\bpseudocode\b/i,
  /write\s+(an?\s+)?algorithm\b/i,
  /describe.{0,40}algorithm\b/i,
  /give\s+(an?\s+)?algorithm\b/i,
];

function classify(text) {
  const wantsC      = C_CODE_PATTERNS.some(re => re.test(text));
  const wantsPseudo = PSEUDO_PATTERNS.some(re => re.test(text));

  if (wantsC && wantsPseudo) return 'both';
  if (wantsC)                return 'c_code';
  if (wantsPseudo)           return 'pseudocode';
  return 'open'; // everything else: generic text answer
}

// ── PDF text extraction ───────────────────────────────────────────────────

async function extractText(filePath) {
  const buf  = fs.readFileSync(filePath);
  const data = await pdfParse(buf);
  return data.text;
}

// ── Question splitting ────────────────────────────────────────────────────
// Supports UZH Informatics exam header formats:
//   2024: "Q1: Title [8 points]"
//   2023: "1  Title [8 points]"   (number, no dot, then title)
//   2022: "Exercise 129 Points"   (pdf-parse collapses "Exercise 1  29 Points")

function splitQuestions(text) {
  // Primary: "Question/Exercise/Q N ... [N points]" or "(N points)"
  const primaryRe  = /\n((?:Question|Exercise|Q\.?\s*)\s*(\d+)[^\n]*?[\[(](\d+)\s*points?[\])])/gi;
  // Secondary (2023): "N  Title [N points]" — dot is optional
  const secondaryRe = /\n((\d+)\.?\s+[^\n]{2,80}[\[(](\d+)\s*points?[\])])/gi;
  // Tertiary (2022): "Exercise N NNPoints" — no brackets, single-digit exercise number
  // (\d) without + captures exactly one digit, so "Exercise 129 Points" → number=1, points=29
  const tertiaryRe  = /\n(((?:Exercise|Question)\s*(\d))\s*(\d+)\s*[Pp]oints)/gi;

  let matches = [];
  let m;

  while ((m = primaryRe.exec(text)) !== null) {
    matches.push({ index: m.index, header: m[1].trim(), number: m[2], points: parseInt(m[3], 10) });
  }

  if (matches.length === 0) {
    while ((m = secondaryRe.exec(text)) !== null) {
      matches.push({ index: m.index, header: m[1].trim(), number: m[2], points: parseInt(m[3], 10) });
    }
  }

  if (matches.length === 0) {
    while ((m = tertiaryRe.exec(text)) !== null) {
      matches.push({ index: m.index, header: m[1].trim(), number: m[3], points: parseInt(m[4], 10) });
    }
  }

  const blocks = [];
  for (let i = 0; i < matches.length; i++) {
    const bodyStart = matches[i].index + matches[i].header.length + 1;
    const bodyEnd   = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const body      = text.slice(bodyStart, bodyEnd).trim();
    blocks.push({
      header:  matches[i].header,
      number:  matches[i].number,
      points:  matches[i].points,
      body,
    });
  }

  return blocks;
}

function findSolution(solBlocks, questionNumber) {
  const b = solBlocks.find(b => b.number === questionNumber);
  return b ? b.body : '(No matching solution block found for this question.)';
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(EXAMS_DIR)) {
    console.error(`ERROR: Old_Excames/ directory not found at:\n  ${EXAMS_DIR}`);
    process.exit(1);
  }

  const allQuestions = [];
  let id = 1;

  for (const year of YEARS) {
    const examFile = path.join(EXAMS_DIR, `FinalExam${year}.pdf`);
    const solFile  = path.join(EXAMS_DIR, `Solution${year}.pdf`);

    if (!fs.existsSync(examFile)) {
      console.warn(`SKIP ${year}: ${path.basename(examFile)} not found`);
      continue;
    }
    if (!fs.existsSync(solFile)) {
      console.warn(`SKIP ${year}: ${path.basename(solFile)} not found`);
      continue;
    }

    console.log(`\nParsing ${year}...`);
    const examText = await extractText(examFile);
    const solText  = await extractText(solFile);

    const examBlocks = splitQuestions(examText);
    const solBlocks  = splitQuestions(solText);

    if (examBlocks.length === 0) {
      console.warn(`  WARNING: No question headers detected in FinalExam${year}.pdf`);
      console.warn('  The parser may need regex adjustments for this PDF\'s format.');
    }

    for (const block of examBlocks) {
      const type = classify(block.body);
      const solutionText = findSolution(solBlocks, block.number);
      allQuestions.push({
        id:             id++,
        year,
        questionNumber: block.number,
        title:          block.header,
        points:         block.points,
        type,
        questionText:   block.body,
        solutionText,
      });
      console.log(`  Q${block.number} (${block.points}pts): kept  [${type}]`);
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(allQuestions, null, 2), 'utf8');
  console.log(`\nDone — saved ${allQuestions.length} question(s) to Mock_Exam/questions.json`);

  if (allQuestions.length === 0) {
    console.warn('\nWARNING: 0 questions were extracted.');
    console.warn('Possible reasons:');
    console.warn('  1. PDF filenames don\'t match expected pattern (FinalExam2022.pdf / Solution2022.pdf)');
    console.warn('  2. Question headers in the PDFs use a format not yet supported by the parser.');
    console.warn('  3. Question bodies were empty after splitting.');
    console.warn('\nTip: Print the raw extracted text to debug:');
    console.warn('  Add `console.log(examText)` after the extractText() call.');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
