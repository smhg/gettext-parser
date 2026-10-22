import { LBP, LBP_TABLE, LBP_CLASS_DATA, LBP_WIDE_DATA, LBP_NONSPACING_DATA } from './unicode-data.js';

// see https://www.gnu.org/software/gettext/manual/html_node/Header-Entry.html
const PLURAL_FORMS = 'Plural-Forms';
export const HEADERS = new Map([
  ['project-id-version', 'Project-Id-Version'],
  ['report-msgid-bugs-to', 'Report-Msgid-Bugs-To'],
  ['pot-creation-date', 'POT-Creation-Date'],
  ['po-revision-date', 'PO-Revision-Date'],
  ['last-translator', 'Last-Translator'],
  ['language-team', 'Language-Team'],
  ['language', 'Language'],
  ['content-type', 'Content-Type'],
  ['content-transfer-encoding', 'Content-Transfer-Encoding'],
  ['plural-forms', PLURAL_FORMS]
]);

const PLURAL_FORM_HEADER_NPLURALS_REGEX = /nplurals\s*=\s*(?<nplurals>\d+)/;

/**
 * Parses a header string into an object of key-value pairs
 *
 * @param {String} str Header string
 * @return {Object} An object of key-value pairs
 */
export function parseHeader (str = '') {
  return str.split('\n')
    .reduce((headers, line) => {
      const parts = line.split(':');
      let key = (parts.shift() || '').trim();

      if (key) {
        const value = parts.join(':').trim();

        key = HEADERS.get(key.toLowerCase()) || key;

        Object.defineProperty(headers, key, { value, writable: true, enumerable: true, configurable: true });
      }

      return headers;
    }, {});
}

/**
 * Attempts to safely parse 'nplurals" value from "Plural-Forms" header
 *
 * @param {Object} [headers = {}] An object with parsed headers
 * @returns {number} Parsed result
 */
export function parseNPluralFromHeadersSafely (headers = {}, fallback = 1) {
  const pluralForms = headers[PLURAL_FORMS];

  if (!pluralForms) {
    return fallback;
  }

  const {
    groups: { nplurals } = { nplurals: '' + fallback }
  } = pluralForms.match(PLURAL_FORM_HEADER_NPLURALS_REGEX) || {};

  return parseInt(nplurals, 10) || fallback;
}

/**
 * Joins a header object of key value pairs into a header string
 *
 * @param {Object} header Object of key value pairs
 * @return {String} Header string
 */
export function generateHeader (header = {}) {
  const keys = Object.keys(header)
    .filter(key => !!key);

  if (!keys.length) {
    return '';
  }

  return keys.map(key =>
    `${key}: ${(header[key] || '').trim()}`
  )
    .join('\n') + '\n';
}

/**
 * Normalizes charset name. Converts utf8 to utf-8, WIN1257 to windows-1257 etc.
 *
 * @param {String} charset Charset name
 * @return {String} Normalized charset name
 */
export function formatCharset (charset = 'iso-8859-1', defaultCharset = 'iso-8859-1') {
  return charset.toString()
    .toLowerCase()
    .replace(/^utf[-_]?(\d+)$/, 'utf-$1')
    .replace(/^win(?:dows)?[-_]?(\d+)$/, 'windows-$1')
    .replace(/^latin[-_]?(\d+)$/, 'iso-8859-$1')
    .replace(/^(us[-_]?)?ascii$/, 'ascii')
    .replace(/^charset$/, defaultCharset)
    .trim();
}

// JavaScript port of the line wrapping the GNU gettext tools use for PO
// output: wrap() in gettext-tools/src/write-po.c, plus the unilbrk
// (UAX #14) and uniwidth code it relies on, as of gettext 1.0.

const BREAK_PROHIBITED = 0;
const BREAK_POSSIBLE = 1;
const BREAK_MANDATORY = 2;

const LBP_CLASSES = decodeRanges(LBP_CLASS_DATA, true);
const LBP_WIDE = decodeRanges(LBP_WIDE_DATA, false);
const LBP_NONSPACING = decodeRanges(LBP_NONSPACING_DATA, false);

// Decodes the range data in lib/unicode-data.js. The format is a
// comma-separated list of `gap:length` or `gap:length:value` hex tuples,
// where `gap` is the distance from the end of the previous range.
function decodeRanges (data, withClass) {
  const ranges = [];
  let prevEnd = -1;

  for (const part of data.split(',')) {
    const [gap, len, cls] = part.split(':').map(n => parseInt(n, 16));
    const start = prevEnd + gap;

    ranges.push(withClass ? [start, start + len, cls] : [start, start + len]);
    prevEnd = start + len;
  }

  return ranges;
}

// (class << 1) | east-asian-wide of a single code point, like
// unilbrkprop_lookup() in unilbrk/lbrktables.h
function lbpEntry (cp) {
  let lo = 0;
  let hi = LBP_CLASSES.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const range = LBP_CLASSES[mid];

    if (cp < range[0]) {
      hi = mid - 1;
    } else if (cp > range[1]) {
      lo = mid + 1;
    } else {
      return range[2];
    }
  }

  return LBP.XX << 1;
}

function inRanges (ranges, cp) {
  let lo = 0;
  let hi = ranges.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const range = ranges[mid];

    if (cp < range[0]) {
      hi = mid - 1;
    } else if (cp > range[1]) {
      lo = mid + 1;
    } else {
      return true;
    }
  }

  return false;
}

// Display width of a code point, like uc_width() in uniwidth/width.c
function charWidth (cp) {
  if (inRanges(LBP_NONSPACING, cp)) {
    return cp > 0 && cp < 0xa0 ? -1 : 0;
  }

  return inRanges(LBP_WIDE, cp) ? 2 : 1;
}

const isQuote = prop => prop === LBP.QU1 || prop === LBP.QU2 || prop === LBP.QU3;
const isAkAl2As = prop => prop === LBP.AK || prop === LBP.AL2 || prop === LBP.AS;
const isLineStart = prop => prop === LBP.BK || prop === LBP.CR || prop === LBP.LF ||
  prop === LBP.SP || prop === LBP.ZW;

// (LB15b) a final quotation mark stays QU3 only before one of these classes
const QU3_FOLLOWERS = new Set([LBP.BK, LBP.CR, LBP.LF, LBP.SP, LBP.GL, LBP.WJ, LBP.CL,
  LBP.QU1, LBP.QU2, LBP.QU3, LBP.CP1, LBP.CP2, LBP.EX, LBP.IS, LBP.SY, LBP.ZW]);
// (LB15a) an initial quotation mark stays QU2 only after one of these classes
const QU2_PRECEDERS = new Set([LBP.BK, LBP.CR, LBP.LF, LBP.OP1, LBP.OP2,
  LBP.QU1, LBP.QU2, LBP.QU3, LBP.GL, LBP.SP, LBP.ZW]);

// Marks candidate break positions in a portion, a port of
// u8_possible_linebreaks_loop() from unilbrk for a non-CJK encoding.
// `chars` is an array of code points and `prohibited` a set of indices that
// must never break.
function possibleLinebreaks (chars, prohibited) {
  const n = chars.length;
  const entries = chars.map(lbpEntry);
  const marks = new Array(n).fill(BREAK_PROHIBITED);

  let precedingProp = LBP.BK; // class of the preceding character
  let prevProp = LBP.BK; // class of the previous character, ignoring CM and ZWJ
  let prevEa = 0; // east-asian-wide bit of the previous character
  let prev2Ea = 0; // east-asian-wide bit of the character before that
  let prevInitialHyphen = false; // the previous character was a word-initial hyphen
  let prevNus = false; // NU (SY | IS)* ended before the previous character
  let lastProp = LBP.BK; // class of the last character, ignoring SP, CM and ZWJ
  let seenSpace = false; // a space came after the last non-space character
  let riCount = 0;

  for (let i = 0; i < n; i++) {
    let prop = entries[i] >> 1;
    const ea = entries[i] & 1;
    const next1 = i + 1 < n ? entries[i + 1] >> 1 : LBP.BK;
    const next1Ea = i + 1 < n ? entries[i + 1] & 1 : 0;
    const next2 = i + 2 < n ? entries[i + 2] >> 1 : LBP.BK;
    const nus = prevProp === LBP.NU || (prevNus && (prevProp === LBP.SY || prevProp === LBP.IS));

    if (prop === LBP.BK || prop === LBP.LF || prop === LBP.CR) {
      // (LB4, LB5, LB6) Mandatory break
      marks[i] = BREAK_MANDATORY;
      lastProp = LBP.BK;
      seenSpace = false;
    } else {
      // Resolve classes whose behaviour is not fixed
      if (prop === LBP.AI || prop === LBP.SA1 || prop === LBP.XX) {
        prop = LBP.AL1;
      } else if (prop === LBP.CB) {
        prop = LBP.ID;
      }

      if (prop === LBP.SP) {
        // (LB7) Don't break just before a space
        seenSpace = true;
      } else if (prop === LBP.ZW) {
        // (LB7) Don't break just before a zero-width space
        lastProp = LBP.ZW;
        seenSpace = false;
      } else if (prop === LBP.CM || prop === LBP.SA2 || prop === LBP.ZWJ) {
        // (LB9) Don't break just before a combining character or zero-width
        // joiner, except after a mandatory break, space or zero-width space
        if (lastProp === LBP.BK) {
          // (LB10) Treat CM or ZWJ as AL
          lastProp = LBP.AL1;
          seenSpace = false;
        } else if (lastProp === LBP.ZW ||
            (seenSpace && lastProp !== LBP.OP1 && lastProp !== LBP.OP2 && lastProp !== LBP.QU2)) {
          // (LB8, LB18) Break after zero-width space or spaces, unless
          // (LB14) or (LB15a) apply
          marks[i] = BREAK_POSSIBLE;
          lastProp = LBP.AL1;
          seenSpace = false;
        }
      } else {
        if (lastProp === LBP.BK) {
          // (LB4, LB5, LB6) Don't break at the beginning of a line
        } else if (lastProp === LBP.ZW) {
          // (LB8) Break after zero-width space
          marks[i] = BREAK_POSSIBLE;
        } else if (precedingProp === LBP.ZWJ) {
          // (LB8a) Don't break right after a zero-width joiner
        } else if (prop === LBP.IS && prevProp === LBP.SP && next1 === LBP.NU) {
          // (LB15c) Break before a decimal mark that follows a space
          marks[i] = BREAK_POSSIBLE;
        } else if ((isQuote(prop) && (!prevEa || !next1Ea) && prevProp !== LBP.SP) ||
            (isQuote(prevProp) && (!prev2Ea || !ea))) {
          // (LB19a) Don't break on either side of ambiguous quotation marks,
          // except next to an east asian character
        } else if (prevInitialHyphen && (prop === LBP.AL1 || prop === LBP.AL2 || prop === LBP.HL)) {
          // (LB20a) Don't break after a word-initial hyphen
        } else if (prevProp === LBP.HL_HY && prop !== LBP.HL) {
          // (LB21a) Don't break after Hebrew + hyphen, before non-Hebrew
        } else if ((prevNus && (prevProp === LBP.CL || prevProp === LBP.CP1 || prevProp === LBP.CP2) &&
            (prop === LBP.PO || prop === LBP.PR)) ||
            (nus && (prop === LBP.PO || prop === LBP.PR || prop === LBP.NU))) {
          // (LB25) Don't break numbers
        } else if ((prevProp === LBP.PO || prevProp === LBP.PR) &&
            (prop === LBP.OP1 || prop === LBP.OP2) &&
            (next1 === LBP.NU || (next1 === LBP.IS && next2 === LBP.NU))) {
          // (LB25) Don't break numbers
        } else if (prevProp === LBP.AKLS_VI && (prop === LBP.AK || prop === LBP.AL2)) {
          // (LB28a) Don't break inside orthographic syllables of Brahmic scripts
        } else if (next1 === LBP.VF && isAkAl2As(prop) && isAkAl2As(prevProp)) {
          // (LB28a) Don't break inside orthographic syllables of Brahmic scripts
        } else if (lastProp === LBP.IS && chars[i] === 0x3c) {
          // GNU partially disables (LB29) to allow a break before an HTML
          // tag in strings like "<P>Some sentence.</P>"
          marks[i] = BREAK_POSSIBLE;
        } else if (lastProp === LBP.RI && prop === LBP.RI) {
          // (LB30a) Break between regional indicators only after an even count
          if (seenSpace || riCount % 2 === 0) {
            marks[i] = BREAK_POSSIBLE;
          }
        } else {
          // (LB15b) Treat QU3 as QU1 unless a closing class follows
          const thisProp = prop === LBP.QU3 && !QU3_FOLLOWERS.has(next1) ? LBP.QU1 : prop;
          const t = LBP_TABLE[lastProp][thisProp];

          if (t === 'D' || (t === 'I' && seenSpace)) {
            marks[i] = BREAK_POSSIBLE;
          }
        }

        // (LB15a) Treat QU2 as QU1 unless an opening class precedes
        if (prop === LBP.QU2 && !QU2_PRECEDERS.has(prevProp)) {
          prop = LBP.QU1;
        }

        lastProp = prop;
        seenSpace = false;
      }
    }

    // (LB9) Treat X (CM | ZWJ)* as if it were X
    if (!((prop === LBP.CM || prop === LBP.ZWJ) && !isLineStart(prevProp))) {
      prevInitialHyphen = (prop === LBP.HY || prop === LBP.HH) &&
        (isLineStart(prevProp) || prevProp === LBP.CB || prevProp === LBP.GL);
      if (prop === LBP.VI && isAkAl2As(prevProp)) {
        prevProp = LBP.AKLS_VI;
      } else if (prevProp === LBP.HL && (prop === LBP.HY || prop === LBP.HH)) {
        prevProp = LBP.HL_HY;
      } else {
        prevProp = prop;
      }
      prev2Ea = prevEa;
      prevEa = ea;
      prevNus = nus;
    }

    precedingProp = prop;
    riCount = prop === LBP.RI ? riCount + 1 : 0;
  }

  for (const i of prohibited) {
    marks[i] = BREAK_PROHIBITED;
  }

  return marks;
}

// Greedy packing of a portion into lines of at most `width` columns, a port
// of u8_width_linebreaks_internal() from unilbrk. Returns the indices of the
// characters that start a new line.
function widthLinebreaks (chars, prohibited, width, startColumn) {
  const marks = possibleLinebreaks(chars, prohibited);
  const breakAt = [];
  let lastP = -1;
  let lastColumn = startColumn;
  let pieceWidth = 0;

  for (let i = 0; i < chars.length; i++) {
    const mark = marks[i];

    if (mark === BREAK_POSSIBLE || mark === BREAK_MANDATORY) {
      if (lastP !== -1 && lastColumn + pieceWidth > width) {
        breakAt.push(lastP);
        lastColumn = 0;
      }
    }

    if (mark === BREAK_MANDATORY) {
      lastP = -1;
      lastColumn = 0;
      pieceWidth = 0;
    } else {
      if (mark === BREAK_POSSIBLE) {
        lastP = i;
        lastColumn += pieceWidth;
        pieceWidth = 0;
      }
      const w = charWidth(chars[i]);
      if (w >= 0) {
        pieceWidth += w;
      }
    }
  }

  if (lastP !== -1 && lastColumn + pieceWidth > width) {
    breakAt.push(lastP);
  }

  return breakAt;
}

export function foldLine (str, maxLen = 79, { name = 'msgid', obsolete = false } = {}) {
  const startColAfterBreak = (obsolete ? 3 : 0) + 1;
  const width = maxLen > 0 ? maxLen - 1 - startColAfterBreak : Number.MAX_SAFE_INTEGER;

  // Split the escaped value into portions, like wrap() does on '\n'
  // characters before escaping. Every `\n` escape ends a portion, and the
  // characters inside escape sequences are never break positions.
  const portions = [];
  let chars = [];
  let prohibited = new Set();
  const it = str[Symbol.iterator]();
  let prev = it.next();

  while (!prev.done) {
    const ch = prev.value;
    chars.push(ch.codePointAt(0));

    if (ch === '\\') {
      const next = it.next();

      if (!next.done) {
        chars.push(next.value.codePointAt(0));
        prohibited.add(chars.length - 1);

        if (next.value === 'n') {
          prohibited.add(chars.length - 2);
          portions.push({ chars, prohibited });
          chars = [];
          prohibited = new Set();
        }
      }
    }
    prev = it.next();
  }
  // GNU only looks at non-empty text after the last portion separator
  if (chars.length || !portions.length) {
    portions.push({ chars, prohibited });
  }

  const lines = [];
  let firstLine = true;

  for (let pi = 0; pi < portions.length; pi++) {
    const { chars, prohibited } = portions[pi];
    const startCol = firstLine ? name.length + 1 : 0;
    let breakAt = widthLinebreaks(chars, prohibited, width, startCol);

    if (firstLine && chars.length &&
        (pi < portions.length - 1 || startCol > width || breakAt.length)) {
      // GNU emits an empty string after the keyword when the value wraps
      lines.push('');
      breakAt = widthLinebreaks(chars, prohibited, width, 0);
    }
    firstLine = false;

    let pos = 0;
    const strChars = chars.map(cp => String.fromCodePoint(cp));
    for (const at of breakAt) {
      lines.push(strChars.slice(pos, at).join(''));
      pos = at;
    }
    lines.push(strChars.slice(pos).join(''));
  }

  return lines;
}
/**
 * Comparator function for comparing msgid
 *
 * @param {Object} object with msgid prev
 * @param {Object} object with msgid next
 * @returns {number} comparator index
 */
export function compareMsgid ({ msgid: left }, { msgid: right }) {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}
