// Verify solve.run() against reference expected output for all practice cases

import { run } from '../solve.js';
import { readFileSync } from 'node:fs';

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

function diff(a, b, path, maxDiffs) {
  const diffs = [];
  if (maxDiffs && diffs.length >= maxDiffs) return diffs;
  if (typeof a !== typeof b) {
    diffs.push(`${path}: type mismatch ${typeof a} vs ${typeof b}`);
    return diffs;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      diffs.push(`${path}: array length ${a.length} vs ${b.length}`);
      if (maxDiffs && diffs.length >= maxDiffs) return diffs;
    }
    for (let i = 0; i < a.length; i++) {
      diffs.push(...diff(a[i], b[i], path + '[' + i + ']', maxDiffs));
      if (maxDiffs && diffs.length >= maxDiffs) return diffs;
    }
    return diffs;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of allKeys) {
      if (!(k in a)) { diffs.push(`${path}.${k}: missing in actual`); continue; }
      if (!(k in b)) { diffs.push(`${path}.${k}: missing in expected`); continue; }
      diffs.push(...diff(a[k], b[k], path + '.' + k, maxDiffs));
      if (maxDiffs && diffs.length >= maxDiffs) return diffs;
    }
    return diffs;
  }
  if (a !== b) {
    diffs.push(`${path}: actual=${JSON.stringify(a)} expected=${JSON.stringify(b)}`);
  }
  return diffs;
}

async function main() {
  const cases = JSON.parse(readFileSync('./test/fixtures/cases.json', 'utf8'));
  const expected = JSON.parse(readFileSync('./test/expected/expected.json', 'utf8'));

  const expMap = {};
  for (const ec of expected.cases) expMap[ec.id] = ec.output;

  let passed = 0, failed = 0;
  const failures = [];

  for (const c of cases) {
    const result = run({ text: c.input.text, header: c.input.header });
    const exp = expMap[c.id];

    if (!exp) {
      failed++;
      failures.push(`${c.id}: no expected output found`);
      continue;
    }

    const d = diff(result, exp, c.id, 5);
    if (d.length === 0) {
      passed++;
    } else {
      failed++;
      failures.push(`${c.id}: ${d.join('; ')}`);
    }
  }

  console.log(`Verification: ${passed} passed, ${failed} failed out of ${cases.length} cases`);
  if (failed > 0) {
    console.log('Failures:');
    for (const f of failures) console.log('  ', f);
    process.exit(1);
  } else {
    console.log('ALL CASES MATCH REFERENCE OUTPUT');
  }
}

main().catch(e => { console.error(e); process.exit(1); });