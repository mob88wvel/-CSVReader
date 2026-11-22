// Correctness test runner for CSV reader entry
// Compares solve.run() output against the reference implementation's expected output

import { run } from '../solve.js';
import { readFileSync } from 'node:fs';

function loadCases() {
  // Try practice input first, then fall back to inline test cases
  try {
    const data = JSON.parse(readFileSync('/tmp/csv-kit/csv-reader-speed-01-run-20261121-kit/practice/input/cases.json', 'utf8'));
    return data;
  } catch (e) {
    return null;
  }
}

function loadExpected() {
  try {
    const data = JSON.parse(readFileSync('/tmp/csv-kit/csv-reader-speed-01-run-20261121-kit/practice/reference/expected.json', 'utf8'));
    return data;
  } catch (e) {
    return null;
  }
}

function deepEqual(a, b, path) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i], path + '[' + i + ']')) return false;
    }
    return true;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) {
      if (!deepEqual(a[k], b[k], path + '.' + k)) return false;
    }
    return true;
  }
  return false;
}

function diff(a, b, path) {
  const diffs = [];
  if (typeof a !== typeof b) {
    diffs.push(`${path}: type mismatch ${typeof a} vs ${typeof b}`);
    return diffs;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      diffs.push(`${path}: array length ${a.length} vs ${b.length}`);
      return diffs;
    }
    for (let i = 0; i < a.length; i++) {
      diffs.push(...diff(a[i], b[i], path + '[' + i + ']'));
    }
    return diffs;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    const allKeys = new Set([...ka, ...kb]);
    for (const k of allKeys) {
      if (!(k in a)) { diffs.push(`${path}.${k}: missing in actual`); continue; }
      if (!(k in b)) { diffs.push(`${path}.${k}: missing in expected`); continue; }
      diffs.push(...diff(a[k], b[k], path + '.' + k));
    }
    return diffs;
  }
  if (a !== b) {
    diffs.push(`${path}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
  }
  return diffs;
}

async function main() {
  const cases = loadCases();
  const expected = loadExpected();

  if (!cases || !expected) {
    console.log('Practice data not available. Running inline tests...');
    await runInlineTests();
    return;
  }

  // Build expected lookup by case id
  const expectedMap = {};
  for (const ec of expected.cases) {
    expectedMap[ec.id] = ec.output;
  }

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const c of cases) {
    const result = run({ text: c.input.text, header: c.input.header });
    const exp = expectedMap[c.id];

    if (!exp) {
      failed++;
      failures.push(`${c.id}: no expected output found`);
      continue;
    }

    const d = diff(result, exp, c.id);
    if (d.length === 0) {
      passed++;
    } else {
      failed++;
      failures.push(`${c.id}: ${d.slice(0, 5).join('; ')}`);
    }
  }

  console.log(`Correctness: ${passed} passed, ${failed} failed out of ${cases.length} cases`);
  if (failed > 0) {
    console.log('First failures:');
    for (const f of failures.slice(0, 10)) {
      console.log('  ', f);
    }
    process.exit(1);
  }
}

async function runInlineTests() {
  // Test basic CSV parsing
  const tests = [
    { name: 'simple', input: 'a,b,c\n1,2,3\n4,5,6', header: true },
    { name: 'quoted', input: 'a,"b,c",d\n1,"x,y",3', header: true },
    { name: 'escaped_quotes', input: 'a\n"he said ""hi"""', header: true },
    { name: 'crlf', input: 'a,b\r\n1,2\r\n', header: true },
    { name: 'bom', input: '﻿a,b\n1,2', header: true },
    { name: 'stray_cr', input: 'a,b\n1\r2\n', header: true },
    { name: 'short_row', input: 'a,b,c\n1,2', header: true },
    { name: 'long_row', input: 'a,b\n1,2,3,4', header: true },
    { name: 'no_header', input: 'a,b\n1,2', header: false },
    { name: 'embedded_newline', input: 'a\n"x\ny"', header: true },
    { name: 'quote_junk', input: 'a\n"x"junk', header: true },
    { name: 'unterminated', input: 'a\n"x', header: true },
  ];

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      const result = run({ text: t.input, header: t.header });
      console.log(`  ${t.name}: OK (${result.rows.length} rows, ${result.errors.length} errors)`);
      passed++;
    } catch (e) {
      console.log(`  ${t.name}: ERROR - ${e.message}`);
      failed++;
    }
  }

  console.log(`Inline tests: ${passed} passed, ${failed} failed`);
}

main().catch(e => { console.error(e); process.exit(1); });