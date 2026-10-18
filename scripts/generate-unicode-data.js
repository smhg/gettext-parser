// Generates lib/unicode-data.js from the line breaking and character width
// tables bundled with a GNU gettext source release.
//
// Usage: npm run generate-unicode-data -- <path to an extracted gettext
// release, e.g. https://ftp.gnu.org/gnu/gettext/gettext-1.0.tar.gz>

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const srcDir = process.argv[2];

if (!srcDir) {
  console.error('Usage: node scripts/generate-unicode-data.js <gettext source dir>');
  process.exit(1);
}

const gnulib = path.join(srcDir, 'gettext-tools/gnulib-lib');
const read = file => readFileSync(path.join(gnulib, file), 'utf8');
const outFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '../lib/unicode-data.js');

const gettextVersion = readFileSync(path.join(srcDir, '.tarball-version'), 'utf8').trim();
const unicodeVersion = /for Unicode ([\d.]+)\./.exec(read('unilbrk/lbrkprop1.h'))[1];

// Line break classes, e.g. LBP_AL1 = 23
const LBP = {};
for (const [, name, value] of read('unilbrk/lbrktables.h').matchAll(/^\s*LBP_(\w+)\s*=\s*(\d+)/gm)) {
  LBP[name] = Number(value);
}

// Evaluates a C initializer element such as `(LBP_AL1<<1)|0` or
// `5 * sizeof (int) / sizeof (short) + 128`
function evaluate (expr) {
  const js = expr
    .replace(/sizeof \(int\)/g, '4')
    .replace(/sizeof \(short\)/g, '2')
    .replace(/LBP_(\w+)/g, (_, name) => LBP[name])
    .replace(/(0x[\da-f]+)U/gi, '$1');

  if (!/^[\s\dxa-f()+\-*/<|]+$/i.test(js)) {
    throw new Error(`Unexpected initializer: ${expr}`);
  }

  const value = Function(`return (${js});`)();

  if (!Number.isInteger(value)) {
    throw new Error(`Non-integer initializer: ${expr}`);
  }

  return value;
}

// Returns the elements of the brace initializer starting at `from`, in order
function initializer (text, from = 0) {
  const start = text.indexOf('{', text.indexOf('=', from));
  const end = text.indexOf('};', start);

  return text.slice(start, end)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/[{}]/g, ',')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(evaluate);
}

// Splits a flat struct initializer into its array fields
function fields (declaration, values) {
  const result = {};
  let offset = 0;

  for (const [, name, size] of declaration.matchAll(/(\w+)\[([^\]]+)\];/g)) {
    const length = evaluate(size);
    result[name] = values.slice(offset, offset + length);
    offset += length;
  }

  if (offset !== values.length) {
    throw new Error('Initializer does not match the struct declaration');
  }

  return result;
}

// unilbrkprop_lookup() in unilbrk/lbrktables.h
const header = {};
for (const [, n, value] of read('unilbrk/lbrkprop1.h').matchAll(/#define lbrkprop_header_(\d) (\d+)/g)) {
  header[n] = Number(value);
}
const lbrkprop = fields(read('unilbrk/lbrkprop1.h').match(/typedef struct\s*{([^}]*)}/)[1],
  initializer(read('unilbrk/lbrkprop2.h')));
const XX_ENTRY = LBP.XX << 1;

function lbrkpropLookup (uc) {
  const index1 = uc >> header[0];

  if (index1 < header[1]) {
    const lookup1 = lbrkprop.level1[index1];

    if (lookup1 >= 0) {
      const lookup2 = lbrkprop.level2[lookup1 + ((uc >> header[2]) & header[3])];

      if (lookup2 >= 0) {
        return lbrkprop.level3[lookup2 + (uc & header[4])];
      }
    }
  }

  return XX_ENTRY;
}

// uc_width() in uniwidth/width.c, for a non-CJK encoding
const width0 = read('uniwidth/width0.h');
const nonspacingData = initializer(width0, width0.indexOf('nonspacing_table_data'));
const nonspacingInd = initializer(width0, width0.indexOf('nonspacing_table_ind'));
const width2Text = read('uniwidth/width2.h');
const width2 = fields(width2Text.match(/struct\s*{([^}]*)}/)[1], initializer(width2Text));
// level1 holds offsets in shorts and level2 offsets in ints, both counted
// from the start of the struct
const level2Start = 2 * (width2.header.length + width2.level1.length);
const level3Start = width2.header.length + width2.level1.length + width2.level2.length / 2;

function isNonspacing (uc) {
  if ((uc >> 9) < nonspacingInd.length) {
    const ind = nonspacingInd[uc >> 9];

    return ind >= 0 && ((nonspacingData[64 * ind + ((uc >> 3) & 63)] >> (uc & 7)) & 1) === 1;
  }

  if ((uc >> 9) === (0xe0000 >> 9)) {
    return uc >= 0xe0100 ? uc <= 0xe01ef : (uc >= 0xe0020 ? uc <= 0xe007f : uc === 0xe0001);
  }

  return false;
}

function isWide (uc) {
  const index1 = uc >> 16;

  if (index1 < width2.header[0]) {
    const lookup1 = width2.level1[index1];

    if (lookup1 >= 0) {
      const lookup2 = width2.level2[lookup1 - level2Start + ((uc >> 9) & 127)];

      if (lookup2 >= 0) {
        return ((width2.level3[lookup2 - level3Start + ((uc >> 5) & 15)] >>> (uc & 31)) & 1) === 1;
      }
    }
  }

  return false;
}

// Encodes code point ranges as `gap:length[:value]` hex tuples, where `gap`
// is the distance from the end of the previous range. This is the format
// decodeRanges() in lib/shared.js reads.
function encodeRanges (valueOf, withValue) {
  const parts = [];
  let prevEnd = -1;
  let start = -1;
  let current = null;

  for (let uc = 0; uc <= 0x110000; uc++) {
    const value = uc < 0x110000 ? valueOf(uc) : null;

    if (value !== current) {
      if (current !== null) {
        const tuple = [start - prevEnd, uc - 1 - start];
        if (withValue) {
          tuple.push(current);
        }
        parts.push(tuple.map(n => n.toString(16)).join(':'));
        prevEnd = uc - 1;
      }
      start = uc;
      current = value;
    }
  }

  return parts.join(',');
}

const classData = encodeRanges(uc => {
  const entry = lbrkpropLookup(uc);
  return entry === XX_ENTRY ? null : entry;
}, true);
const wideData = encodeRanges(uc => !isNonspacing(uc) && isWide(uc) ? true : null, false);
const nonspacingRanges = encodeRanges(uc => isNonspacing(uc) ? true : null, false);

// unilbrk_table in unilbrk/lbrktables.c, one string of P/I/D per row
const tableText = read('unilbrk/lbrktables.c');
const table = [...tableText.slice(tableText.indexOf('unilbrk_table'))
  .matchAll(/^\/\*\s*\w+\s*\*\/\s*{([^}]*)}/gm)]
  .map(([, row]) => row.replace(/[\s,]/g, ''));

if (table.length !== 43 || table.some(row => row.length !== table.length)) {
  throw new Error('Unexpected unilbrk_table shape');
}

const names = Object.keys(LBP);
const lines = [
  '// Generated by scripts/generate-unicode-data.js. Do not edit.',
  `// Source: GNU gettext ${gettextVersion} (gnulib unilbrk and uniwidth tables, Unicode ${unicodeVersion})`,
  '',
  '// Line break classes, as in gnulib unilbrk/lbrktables.h',
  'export const LBP = {',
  ...names.map((name, i) => `  ${name}: ${LBP[name]}${i < names.length - 1 ? ',' : ''}`),
  '};',
  '',
  '// Pair table indexed by [before][after] class: P(rohibited), I(ndirect) or D(irect) break',
  'export const LBP_TABLE = [',
  ...table.map((row, i) => `  '${row}'${i < table.length - 1 ? ',' : ''}`),
  '];',
  '',
  '// Code point ranges with their (class << 1) | east-asian-wide value; others are XX',
  `export const LBP_CLASS_DATA = '${classData}';`,
  '',
  '// Code point ranges that are 2 columns wide',
  `export const LBP_WIDE_DATA = '${wideData}';`,
  '',
  '// Code point ranges that are non-spacing or control characters',
  `export const LBP_NONSPACING_DATA = '${nonspacingRanges}';`,
  ''
];

writeFileSync(outFile, lines.join('\n'));
console.log(`Wrote ${path.relative(process.cwd(), outFile)} from gettext ${gettextVersion}, Unicode ${unicodeVersion}`);
