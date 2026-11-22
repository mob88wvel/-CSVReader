// Additional edge case tests for CSV parser
// Expectations match the official reference implementation (csv-reader 1.0.0)

import { run } from '../solve.js';

const tests = [
  { name: 'empty input', input: '', header: true, expected: { columns: [], rows: [], errors: [] } },
  { name: 'only BOM', input: '﻿', header: true, expected: { columns: [], rows: [], errors: [] } },
  { name: 'single field no header', input: 'value', header: false, expected: { columns: null, rows: [['value']], errors: [] } },
  { name: 'single field with header', input: 'col\nvalue', header: true, expected: { columns: ['col'], rows: [['value']], errors: [] } },
  { name: 'multiple empty fields', input: ',,\n,,', header: false, expected: { columns: null, rows: [['', '', ''], ['', '', '']], errors: [] } },
  { name: 'trailing comma', input: 'a,b,\n1,2,', header: false, expected: { columns: null, rows: [['a', 'b', ''], ['1', '2', '']], errors: [] } },
  { name: 'leading comma', input: ',a,b\n,1,2', header: false, expected: { columns: null, rows: [['', 'a', 'b'], ['', '1', '2']], errors: [] } },
  { name: 'quoted empty field', input: 'a,"",b\n1,"",2', header: false, expected: { columns: null, rows: [['a', '', 'b'], ['1', '', '2']], errors: [] } },
  { name: 'double quotes in field', input: 'a,"he said ""hi""",b', header: false, expected: { columns: null, rows: [['a', 'he said "hi"', 'b']], errors: [] } },
  { name: 'newline in quoted field', input: 'a,"line1\nline2",b', header: false, expected: { columns: null, rows: [['a', 'line1\nline2', 'b']], errors: [] } },
  { name: 'CRLF line endings', input: 'a,b\r\n1,2\r\n', header: false, expected: { columns: null, rows: [['a', 'b'], ['1', '2']], errors: [] } },
  { name: 'lone CR', input: 'a,b\n1\r2', header: false, expected: { columns: null, rows: [['a', 'b'], ['12', '']], errors: [{ code: 'stray_cr', line: 2, row: 1 }, { code: 'short_row', line: 2, row: 1, fields: 1 }] } },
  { name: 'BOM at start', input: '﻿a,b\n1,2', header: false, expected: { columns: null, rows: [['a', 'b'], ['1', '2']], errors: [] } },
  { name: 'unterminated quote', input: 'a\n"x', header: false, expected: { columns: null, rows: [['a'], ['"x']], errors: [{ code: 'unterminated_quote', line: 2, row: 1 }] } },
  { name: 'quote junk', input: 'a\n"x"junk', header: false, expected: { columns: null, rows: [['a'], ['xjunk']], errors: [{ code: 'quote_junk', line: 2, row: 1 }] } },
  { name: 'short row', input: 'a,b,c\n1,2', header: false, expected: { columns: null, rows: [['a', 'b', 'c'], ['1', '2', '']], errors: [{ code: 'short_row', line: 2, row: 1, fields: 2 }] } },
  { name: 'long row', input: 'a,b\n1,2,3,4', header: false, expected: { columns: null, rows: [['a', 'b'], ['1', '2']], errors: [{ code: 'long_row', line: 2, row: 1, extra: ['3', '4'] }] } },
  { name: 'embedded CRLF in quotes', input: 'a,"line1\r\nline2",b', header: false, expected: { columns: null, rows: [['a', 'line1\nline2', 'b']], errors: [] } },
  { name: 'escaped quotes', input: 'a,"he said ""hi""",b', header: false, expected: { columns: null, rows: [['a', 'he said "hi"', 'b']], errors: [] } },
  { name: 'quote in unquoted field', input: 'a,b"c,d', header: false, expected: { columns: null, rows: [['a', 'b"c', 'd']], errors: [] } },
  { name: 'blank line skipped', input: 'a,b\n\n1,2', header: false, expected: { columns: null, rows: [['a', 'b'], ['1', '2']], errors: [] } },
  { name: 'stray CR only line', input: 'a,b\r\n\r\n1,2', header: false, expected: { columns: null, rows: [['a', 'b'], ['1', '2']], errors: [] } },
  { name: 'large field count', input: Array(100).fill('x').join(','), header: false, expected: { columns: null, rows: [Array(100).fill('x')], errors: [] } },
];

function runTests() {
  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      const result = run({ text: t.input, header: t.header });
      const exp = t.expected;

      // Compare columns
      const colsMatch = JSON.stringify(result.columns) === JSON.stringify(exp.columns);
      const rowsMatch = JSON.stringify(result.rows) === JSON.stringify(exp.rows);
      const errorsMatch = JSON.stringify(result.errors) === JSON.stringify(exp.errors);

      if (colsMatch && rowsMatch && errorsMatch) {
        console.log(`  ✓ ${t.name}`);
      } else {
        console.log(`  ✗ ${t.name}`);
        if (!colsMatch) console.log(`  columns: got ${JSON.stringify(result.columns)} expected ${JSON.stringify(exp.columns)}`);
        if (!rowsMatch) console.log(`  rows: got ${JSON.stringify(result.rows)} expected ${JSON.stringify(exp.rows)}`);
        if (!errorsMatch) console.log(`  errors: got ${JSON.stringify(result.errors)} expected ${JSON.stringify(exp.errors)}`);
      }
    } catch (e) {
      console.log(`  ✗ ${t.name}: ERROR - ${e.message}`);
    }
  }
}

console.log('Running additional edge case tests...');
runTests();