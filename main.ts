// csv-reader speed competition entrypoint (Node 22)
// Reads /input/cases.json and writes /output/answers.json
// Each case: { id: string, input: { text: string }, header?: boolean }
// Output: array of { id: string, output: { columns, rows, errors } }

import { run } from './solve.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

function main() {
  const inputDir = process.env.MAKEFUN_INPUT_DIR ?? '/input';
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

  const casesPath = join(inputDir, 'cases.json');
  const cases = JSON.parse(readFileSync(casesPath, 'utf8'));

  const answers = [];
  for (const c of cases) {
    const result = run({ text: c.input.text, header: c.input.header });
    answers.push({ id: c.id, output: result });
  }

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, 'answers.json'), JSON.stringify(answers));
}

main();