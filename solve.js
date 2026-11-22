// csv-reader speed competition entry — fast drop-in replacement for csv-reader 1.0.0
//
// Exports run(input) where input = { text: string } and returns
// { columns: string[] | null, rows: string[][], errors: {code, line, row, ...}[] }
//
// Behavior exactly matches csv-reader 1.0.0's broken-row policy:
//   - U+FEFF at start dropped
//   - Record ends at LF or CRLF; blank lines are no records
//   - Lone CR outside quotes dropped (stray_cr)
//   - Quoted fields run to next non-doubled quote; "" = one quote
//   - CRLF/lone CR inside quotes read as LF
//   - Text after closing quote up to next comma/line break appended (quote_junk)
//   - Unterminated quote treated as literal, text after re-read as unquoted
//   - Quote inside unquoted field is literal
//   - columns = first record when header=true else null
//   - Short rows padded with "", long rows cut to first record's width
//   - Errors: {code, line, row, fields?, extra?} in order met

const BOM = 0xFEFF;
const QUOTE = 0x22;   // '"'
const COMMA = 0x2C;   // ','
const LF = 0x0A;      // '\n'
const CR = 0x0D;      // '\r'

const COMMA_END = 'comma';
const LINE_BREAK_END = 'line break';
const END_END = 'end';

export function run(input) {
  return readCsv(String(input.text), input.header === true);
}

function readCsv(text, header) {
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  const n = text.length;
  let pos = 0;
  let line = 1;

  if (n > 0 && text.charCodeAt(0) === BOM) pos = 1;

  let recordLine = 1;
  let recordRow = null;

  // Helper: peek at current char
  function at(i) {
    return i < n ? text.charCodeAt(i) : 0;
  }

  // Read unquoted field: returns { value, ended, added }
  function readUnquoted(value) {
    let added = 0;
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === COMMA) {
        pos += 1;
        return { value, ended: COMMA_END, added };
      }
      if (c === LF) {
        pos += 1;
        line += 1;
        return { value, ended: LINE_BREAK_END, added };
      }
      if (c === CR) {
        if (at(pos + 1) === LF) {
          pos += 2;
          line += 1;
          return { value, ended: LINE_BREAK_END, added };
        }
        errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
        pos += 1;
        continue;
      }
      value += text[pos];
      added += 1;
      pos += 1;
    }
    return { value, ended: END_END, added };
  }

  // Read quoted field
  function readQuoted() {
    const openPos = pos;
    const openLine = line;
    const chunks = [];
    pos += 1; // skip opening quote
    let closed = false;
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === QUOTE) {
        if (at(pos + 1) === QUOTE) {
          chunks.push('"');
          pos += 2;
          continue;
        }
        pos += 1;
        closed = true;
        break;
      }
      if (c === CR) {
        chunks.push('\n');
        line += 1;
        pos += (at(pos + 1) === LF) ? 2 : 1;
        continue;
      }
      if (c === LF) line += 1;
      chunks.push(text[pos]);
      pos += 1;
    }
    if (!closed) {
      // Unterminated quote: literal quote char, re-read rest as unquoted
      pos = openPos + 1;
      line = openLine;
      errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
      return readUnquoted('"');
    }
    const qvalue = chunks.join('');
    if (pos >= n) return { value: qvalue, ended: END_END };
    const cAfter = text.charCodeAt(pos);
    if (cAfter === COMMA) { pos += 1; return { value: qvalue, ended: COMMA_END }; }
    if (cAfter === LF) { pos += 1; line += 1; return { value: qvalue, ended: LINE_BREAK_END }; }
    if (cAfter === CR && at(pos + 1) === LF) { pos += 2; line += 1; return { value: qvalue, ended: LINE_BREAK_END }; }
    // Quote junk: text after closing quote up to next comma/line break
    const junk = readUnquoted(qvalue);
    if (junk.added > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
    return junk;
  }

  while (pos < n) {
    // Skip blank lines
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === LF) { pos += 1; line += 1; }
      else if (c === CR && at(pos + 1) === LF) { pos += 2; line += 1; }
      else break;
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;

    const fields = [];
    let field;
    let quoted;
    do {
      quoted = text.charCodeAt(pos) === QUOTE;
      field = quoted ? readQuoted() : readUnquoted('');
      fields.push(field.value);
    } while (field.ended === COMMA_END);

    // A line that held only stray CRs is left with no characters: no record
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}