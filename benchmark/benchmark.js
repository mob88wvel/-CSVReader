// Performance benchmark for CSV reader
// Implements official competition benchmark methodology:
// - 1 warm-up run
// - 9 timed runs
// - Trimmed mean (remove highest and lowest)
// - Compare against official baseline (csv-reader 1.0.0)

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ref = require('../test/reference/csv-reader-1.0.0.js');
import { run } from '../solve.js';
import { readFileSync } from 'node:fs';

function loadCases() {
  return JSON.parse(readFileSync('./test/fixtures/cases.json', 'utf8'));
}

function trimmedMean(times) {
  if (times.length < 3) return times.reduce((a, b) => a + b, 0) / times.length;
  const sorted = [...times].sort((a, b) => a - b);
  // Remove highest and lowest (trimmed mean of 9 runs -> 7 values)
  const trimmed = sorted.slice(1, -1);
  return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
}

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdev(arr) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1));
}

function runBenchmark(input, header, iterations = 10) {
  const times = [];

  // Warm-up run (discarded)
  run({ text: input, header });

  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    run({ text: input, header });
    const end = process.hrtime.bigint();
    const ns = Number(end - start);
    times.push(ns / 1_000_000); // convert to milliseconds
  }

  return times;
}

function runReferenceBenchmark(input, header, iterations = 10) {
  const times = [];

  // Warm-up
  ref.readCsv({ text: input, header });

  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    ref.readCsv({ text: input, header });
    const end = process.hrtime.bigint();
    const ns = Number(end - start);
    times.push(ns / 1_000_000); // convert to milliseconds
  }

  return times;
}

async function main() {
  const cases = JSON.parse(readFileSync('./test/fixtures/cases.json', 'utf8'));

  console.log('=== CSV Reader Speed Benchmark ===\n');

  // Official baseline (from requirements): csv-reader 1.0.0 ~1.38s CPU average
  // We'll run both our implementation and the reference to compare

  const results = [];

  for (const c of cases) {
    console.log(`\n--- Case ${c.id} (header: ${c.input.header}) ---`);
    console.log(`Input size: ${c.input.text.length} bytes (~${(c.input.text.length / 1024 / 1024).toFixed(2)} MB)`);

    const myTimes = runBenchmark(c.input.text, c.input.header);
    const refTimes = runReferenceBenchmark(c.input.text, c.input.header);

    const myTrimmed = trimmedMean(myTimes);
    const refTrimmed = trimmedMean(refTimes);
    const myMean = mean(myTimes);
    const refMean = mean(refTimes);
    const myStdev = stdev(myTimes);
    const refStdev = stdev(refTimes);

    console.log(`  Our impl:    mean=${myMean.toFixed(2)}ms, trimmed=${myTrimmed.toFixed(2)}ms, stdev=${myStdev.toFixed(2)}ms`);
    console.log(`  Reference:   mean=${refMean.toFixed(2)}ms, trimmed=${refTrimmed.toFixed(2)}ms, stdev=${refStdev.toFixed(2)}ms`);
    console.log(`  Speedup:     ${(refTrimmed / myTrimmed).toFixed(2)}x faster`);

    results.push({
      case: c.id,
      header: c.input.header,
      myTrimmed,
      refTrimmed,
      myMean,
      refMean,
      myStdev,
      refStdev,
      speedup: refTrimmed / myTrimmed,
      inputSize: c.input.text.length
    });
  }

  console.log('\n=== SUMMARY ===');
  const totalMyTrimmed = results.reduce((a, b) => a + b.myTrimmed, 0);
  const totalRefTrimmed = results.reduce((a, b) => a + b.refTrimmed, 0);
  const totalMyMean = results.reduce((a, b) => a + b.myMean, 0);
  const totalRefMean = results.reduce((a, b) => a + b.refMean, 0);

  console.log(`Total our trimmed mean:    ${totalMyTrimmed.toFixed(2)}ms`);
  console.log(`Total reference trimmed:   ${totalRefTrimmed.toFixed(2)}ms`);
  console.log(`Overall speedup:           ${(totalRefTrimmed / totalMyTrimmed).toFixed(2)}x`);

  // Official baseline: csv-reader 1.0.0 ~1.38s CPU
  console.log('\n--- Official Baseline Comparison ---');
  const baselineMs = 1380; // 1.38s
  console.log(`Official baseline: ${baselineMs}ms`);
  console.log(`Our total trimmed mean: ${totalMyTrimmed.toFixed(2)}ms`);
  console.log(`Baseline speedup: ${(baselineMs / totalMyTrimmed).toFixed(2)}x`);

  console.log('\n=== CONFIDENCE TEST ===');
  console.log('Note: For official competition, we need 9 timed runs and trimmed mean');
  console.log('beating baseline at 95% confidence (one-sided).');
  console.log(`Our total trimmed mean: ${totalMyTrimmed.toFixed(2)}ms`);
  console.log(`Baseline: ${baselineMs}ms`);
  console.log(`Ratio: ${(baselineMs / totalMyTrimmed).toFixed(2)}x`);
}

main().catch(e => { console.error(e); process.exit(1); });