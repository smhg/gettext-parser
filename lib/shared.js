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
// (UAX #14) and uniwidth code it relies on.

const LBP = {
  WJ: 0, GL: 1, B2: 2, BA: 3, BB: 4, HY: 5, CL: 6, CP1: 7, CP2: 8, EX: 9,
  IN: 10, NS: 11, OP1: 12, OP2: 13, QU1: 14, QU2: 15, QU3: 16, IS: 17,
  NU: 18, PO: 19, PR: 20, SY: 21, AL: 22, H2: 23, H3: 24, ID1: 25, ID2: 26,
  JL: 27, JV: 28, JT: 29, HL: 30, AP: 31, AK: 32, AS: 33, VI: 34, VF: 35,
  RI: 36, ZWJ: 37, EB: 38, EM: 39, BK: 40, CR: 41, LF: 42, CM: 43, ZW: 44,
  SP: 45, CB: 46, AI: 47, SA: 48, XX: 49,
  HL_BA: 100
};

const BREAK_PROHIBITED = 0;
const BREAK_POSSIBLE = 1;
const BREAK_MANDATORY = 2;

const LBP_CLASS_DATA = '1:8:2b,1:0:3,1:0:2a,1:1:28,1:0:29,1:11:2b,1:0:2d,1:0:9,1:0:e,2:0:14,1:0:13,2:0:e,1:0:c,1:0:7,2:0:14,1:0:11,1:0:5,1:0:11,1:0:15,1:9:12,1:1:11,4:0:9,1c:0:c,1:0:14,1:0:7,1e:0:c,1:0:3,1:0:6,2:5:2b,1:0:28,1:19:2b,1:0:1,1:0:c,1:0:13,1:2:14,6:0:f,2:0:3,3:0:13,1:0:14,3:0:4,7:0:10,4:0:c,209:0:4,4:0:4,13:0:4,21:4e:2b,1:0:1,1:b:2b,1:6:1,1:c:2b,f:0:11,105:6:2b,100:0:11,1:0:3,5:0:14,2:2c:2b,1:0:3,1:0:2b,2:1:2b,2:1:2b,1:0:9,1:0:2b,9:1a:1e,5:3:1e,e:5:12,4:2:13,1:1:11,3:a:2b,1:0:9,1:0:2b,1:2:9,2c:14:2b,1:9:12,1:0:13,1:1:12,4:0:2b,64:0:9,2:6:2b,1:0:12,2:5:2b,3:1:2b,2:3:2b,3:9:12,18:0:2b,1f:1a:2b,5c:a:2b,10:9:12,22:8:2b,5:0:11,1:0:9,4:0:2b,1:1:14,17:3:2b,2:8:2b,2:2:2b,2:4:2b,2c:2:2b,35:1:12,7:7:2b,2b:17:2b,1:0:12,1:20:2b,37:2:2b,2:11:2b,2:6:2b,b:1:2b,1:1:3,1:9:12,12:2:2b,39:0:2b,2:6:2b,3:1:2b,3:2:2b,a:0:2b,b:1:2b,3:9:12,3:1:13,6:0:13,2:0:14,3:0:2b,3:2:2b,39:0:2b,2:4:2b,5:1:2b,3:2:2b,4:0:2b,15:9:12,1:1:2b,4:0:2b,c:2:2b,39:0:2b,2:7:2b,2:2:2b,2:2:2b,15:1:2b,3:9:12,2:0:14,9:5:2b,2:2:2b,39:0:2b,2:6:2b,3:1:2b,3:2:2b,8:2:2b,b:1:2b,3:9:12,13:0:2b,3c:4:2b,4:2:2b,2:3:2b,a:0:2b,f:9:12,a:0:14,7:4:2b,38:0:2b,2:6:2b,2:2:2b,2:3:2b,8:1:2b,c:1:2b,3:9:12,8:0:4,a:2:2b,1:0:4,38:0:2b,2:6:2b,2:2:2b,2:3:2b,8:1:2b,c:1:2b,3:9:12,4:0:2b,d:3:2b,38:1:2b,2:6:2b,2:2:2b,2:3:2b,a:0:2b,b:1:2b,3:9:12,a:0:13,8:2:2b,47:0:2b,5:5:2b,2:0:2b,2:7:2b,7:9:12,3:1:2b,4c:0:14,11:9:12,1:1:3,75:9:12,28:3:4,2:1:4,1:0:1,1:1:4,1:0:3,1:0:1,1:4:9,1:0:1,2:0:9,4:1:2b,7:9:12,b:0:3,1:0:2b,2:0:2b,2:0:2b,1:0:c,1:0:6,1:0:c,1:0:6,1:1:2b,32:d:2b,1:0:3,1:4:2b,1:0:3,1:1:2b,6:a:2b,2:23:2b,2:1:3,7:0:2b,a:1:4,1:0:3,1:0:4,6:1:1,66:9:12,1:1:3,45:9:12,67:5f:1b,1:47:1c,1:57:1d,15e:2:2b,2:0:3,9f:0:3,280:0:3,1b:0:c,1:0:6,4f:2:3,25:3:2b,1d:2:2b,1:1:3,1c:1:2b,1f:1:2b,61:1:3,1:0:b,2:0:3,2:0:3,1:0:14,5:9:12,19:1:9,1:1:3,1:0:4,2:1:9,2:2:2b,1:0:1,1:0:2b,1:9:12,6c:1:2b,23:0:2b,77:b:2b,5:b:2b,9:1:9,1:9:12,81:9:12,3e:4:2b,64:0:2b,1:9:12,7:9:12,17:1e:2b,32:4:2b,1:2e:20,1:f:2b,1:0:22,1:7:20,4:9:19,1:1:3,1:0:19,1:3:3,1:9:19,1:8:2b,1:8:19,1:1:3,2:2:2b,1f:c:2b,3:9:12,7:25:21,1:b:2b,1:1:23,31:13:2b,4:4:3,1:9:12,7:9:12,25:1:3,51:2:2b,2:14:2b,5:0:2b,7:0:2b,3:2:2b,c7:c:2b,1:0:1,1:2d:2b,1:0:1,1:2:2b,1fe:0:4,3:6:3,1:0:1,1:2:3,1:0:2c,1:0:2b,1:0:25,1:1:2b,1:0:3,1:0:1,1:1:3,1:0:2,4:0:f,1:0:10,1:0:c,1:1:f,1:0:10,1:0:c,1:0:f,5:2:a,1:0:3,1:1:28,1:4:2b,1:0:1,1:7:13,2:0:f,1:0:10,2:1:b,7:0:11,1:0:c,1:0:6,1:2:b,d:0:3,1:0:13,1:3:3,2:2:3,1:0:0,6:9:2b,e:0:c,1:0:6,f:0:c,1:0:6,12:6:14,1:0:13,1:d:14,1:0:13,1:3:14,1:0:13,1:1:14,1:0:13,1:0:14,1:0:13,1:e:14,1:20:2b,13:0:13,6:0:13,d:0:14,fc:1:14,dc:0:a,19:0:c,1:0:6,1:0:c,1:0:6,f:1:19,e:0:d,1:0:6,c6:3:19,20d:3:19,11:1:19,3:0:19,2:2:19,1:0:26,1:1:19,1a:2:19,2d:0:19,17:0:19,3e:b:19,5:0:19,2:2:19,2:1:19,4:1:19,3:0:19,3:2:19,9:0:19,7:4:19,2:1:19,1:0:26,1:0:19,3:7:19,4:1:19,1:3:26,4e:5:e,2:1:9,1:0:19,4:0:c,1:0:6,1:0:c,1:0:6,1:0:c,1:0:6,1:0:c,1:0:6,1:0:c,1:0:6,1:0:c,1:0:6,1:0:c,1:0:6,50:0:c,1:0:6,20:0:c,1:0:6,1:0:c,1:0:6,1:0:c,1:0:6,1:0:c,1:0:6,1:0:c,1:0:6,194:0:c,1:0:6,1:0:c,1:0:6,1:0:c,1:0:6,1:0:c,1:0:6,1:0:c,1:0:6,1:0:c,1:0:6,1:0:c,1:0:6,1:0:c,1:0:6,1:0:c,1:0:6,1:0:c,1:0:6,1:0:c,1:0:6,40:0:c,1:0:6,1:0:c,1:0:6,21:0:c,1:0:6,2f2:2:2b,8:0:9,1:2:3,2:0:9,1:0:3,71:0:3,f:0:2b,61:1f:2b,1:1:e,1:0:f,1:0:10,1:0:f,1:0:10,1:2:e,1:0:f,1:0:10,1:0:e,1:0:f,1:0:10,1:7:3,2:0:3,1:0:c,1:0:3,3:0:f,1:0:10,3:0:f,1:0:10,1:0:c,1:0:6,1:0:c,1:0:6,1:0:c,1:0:6,1:0:c,1:0:6,1:3:3,1:0:9,2:1:3,2:1:3,6:1:2,1:2:3,2:1:3,1:0:c,1:7:3,2:0:3,2:1:3,4:1:9,1:0:c,1:0:6,1:0:c,1:0:6,1:0:c,1:0:6,1:0:c,1:0:6,1:0:3,23:19:19,2:58:19,d:d5:19,1b:f:19,1:0:3,1:1:6,1:1:19,1:0:b,1:1:19,1:0:d,1:0:6,1:0:d,1:0:6,1:0:d,1:0:6,1:0:d,1:0:6,1:0:d,1:0:6,1:1:19,1:0:d,1:0:6,1:0:d,1:0:6,1:0:d,1:0:6,1:0:d,1:0:6,1:0:b,1:0:d,1:1:6,1:9:19,1:5:2b,1:4:19,1:0:2b,1:4:19,1:1:b,1:2:19,2:0:b,1:0:19,1:0:b,1:0:19,1:0:b,1:0:19,1:0:b,1:0:19,1:0:b,1:18:19,1:0:b,1:1e:19,1:0:b,1:0:19,1:0:b,1:0:19,1:0:b,1:5:19,1:0:b,1:5:19,1:1:b,3:1:2b,1:3:b,1:0:19,1:1:b,1:0:19,1:0:b,1:0:19,1:0:b,1:0:19,1:0:b,1:0:19,1:0:b,1:18:19,1:0:b,1:1e:19,1:0:b,1:0:19,1:0:b,1:0:19,1:0:b,1:5:19,1:0:b,1:5:19,1:1:b,1:3:19,1:3:b,1:0:19,6:2a:19,2:5d:19,2:53:19,c:0:19,1:f:b,1:1e:19,2:27:19,9:1b6f:19,41:5214:19,1:0:b,1:476:19,4:36:19,38:1:3,10e:0:3,1:0:9,1:0:3,11:9:12,46:3:2b,2:9:2b,21:1:2b,51:1:2b,2:4:3,10b:0:2b,4:0:2b,5:0:2b,18:4:2b,5:0:2b,c:0:13,3c:1:4,1:1:9,9:1:2b,33:11:2b,9:1:3,1:9:12,7:11:2b,b:0:4,3:0:2b,1:9:12,1d:7:2b,1:1:3,18:c:2b,d:1c:1b,4:3:2b,1:2e:20,1:c:2b,1:0:22,1:5:19,1:2:3,1:3:19,2:0:3,1:9:19,5:1:19,11:9:12,7:28:21,1:d:2b,a:2:3,1:0:2b,1:7:3,1:1:2b,3:9:19,3:0:19,1:2:3,8c:4:2b,1:1:3,4:1:2b,ed:7:2b,1:0:3,1:1:2b,3:9:12,7:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,1:0:17,1:1a:18,d:16:1c,5:30:1d,2105:1ff:19,1e:0:1e,1:0:2b,1:9:1e,2:c:1e,2:4:1e,2:0:1e,2:1:1e,2:1:1e,2:9:1e,1ef:0:6,1:0:c,bd:0:13,4:f:2b,1:0:11,1:1:6,1:1:11,1:1:9,1:0:d,1:0:6,1:0:a,7:f:2b,1:4:19,1:0:d,1:0:6,1:0:d,1:0:6,1:0:d,1:0:6,1:0:d,1:0:6,1:0:d,1:0:6,1:0:d,1:0:6,1:0:d,1:0:6,1:0:d,1:0:6,1:1:19,1:0:d,1:0:6,1:6:19,1:0:6,1:0:19,1:0:6,2:1:b,1:1:9,1:0:19,1:0:d,1:0:6,1:0:d,1:0:6,1:0:d,1:0:6,1:7:19,2:0:19,1:0:14,1:0:13,1:0:19,94:0:0,2:0:9,1:1:19,1:0:14,1:0:13,1:1:19,1:0:d,1:0:6,1:1:19,1:0:6,1:0:19,1:0:6,1:a:19,1:1:b,1:2:19,1:0:9,1:1a:19,1:0:d,1:0:19,1:0:6,1:1c:19,1:0:d,1:0:19,1:0:6,1:0:19,1:0:d,1:1:6,1:0:d,1:1:6,1:0:b,1:0:19,1:9:b,1:2c:19,1:1:b,1:1e:19,4:5:19,3:5:19,3:5:19,3:2:19,4:0:13,1:0:14,1:2:19,1:1:14,13:2:2b,1:0:2e,104:2:3,fb:0:2b,e3:0:2b,96:4:2b,25:0:3,31:0:3,d0:9:12,3ae:0:3,c8:0:3,e2:2:2b,2:1:2b,6:3:2b,29:2:2b,5:0:2b,11:7:3,8e:1:2b,a:5:3,1:0:a,43:6:3,1e5:3:2b,9:9:12,172:1:2b,1:0:3,50:2:2b,47:a:2b,32:3:2b,7b:2:2b,1:1:1f,1:32:20,1:d:2b,1:0:22,1:1:3,1:4:19,5:13:19,1:9:21,1:0:2b,1:1:20,1:1:2b,1:0:20,a:0:1,1:2:2b,2e:a:2b,3:0:12,1:3:3,1:0:2b,b:0:12,23:9:12,7:2:2b,25:d:2b,2:9:12,1:3:3,2:1:2b,2d:0:2b,2:0:4,b:2:2b,31:d:2b,5:1:3,2:0:3,1:3:2b,2:1:2b,1:9:12,2:0:4,2:2:3,4d:b:2b,1:1:3,2:1:3,2:0:2b,3:0:2b,68:0:3,36:b:2b,6:9:12,7:3:2b,2:7:20,3:1:20,3:15:20,2:6:20,2:1:20,2:4:20,2:1:2b,1:0:3,1:6:2b,3:1:2b,3:1:2b,1:0:22,3:0:21,7:0:2b,6:0:3,1:1:21,1:1:20,1:1:2b,3:6:2b,4:4:2b,c1:11:2b,5:3:3,2:9:12,1:1:3,3:0:2b,52:13:2b,d:9:12,d6:6:2b,3:8:2b,1:0:4,1:1:3,1:1:9,4:e:3,5:1:2b,53:10:2b,1:1:3,e:9:12,7:c:4,3f:c:2b,9:9:12,67:9:12,3:2:3,ee:e:2b,a6:9:12,17:6:20,3:0:20,3:7:20,2:1:20,2:17:20,1:5:2b,2:1:2b,3:2:2b,1:0:22,1:0:1f,1:0:2b,1:0:1f,1:1:2b,1:2:3,a:9:19,78:6:2b,3:6:2b,2:0:4,2:0:2b,1d:9:2b,29:6:2b,2:3:2b,1:0:4,2:3:3,1:0:4,2:0:2b,a:a:2b,2f:f:2b,1:2:3,2:2:4,1:1:3,5e:9:4,126:7:2b,2:7:2b,2:4:3,b:9:12,17:0:4,1:0:9,21:15:2b,2:d:2b,7b:5:2b,4:0:2b,2:1:2b,2:6:2b,2:0:2b,9:9:12,31:4:2b,2:1:2b,2:4:2b,9:9:12,137:11:21,1:0:3,1:3:2b,1:1:3,8:1:2b,1:0:1f,1:0:2b,1:c:20,2:21:20,1:6:2b,4:3:2b,1:0:22,1:1:3,1:a:19,1:9:21,84:3:13,1f:0:3,471:4:3,de4:2:c,1:2:6,25:0:6,4:0:c,1:0:6,1:0:c,1:0:6,f0:0:c,1:1:6,b4:0:c,1:6:1,1:0:c,1:0:6,1:2:1,1:0:c,1:0:6,1:0:c,1:0:6,1:0:2b,7:e:2b,1179:0:c,1:0:6,2491:9:12,5:1:3,51:9:12,27:4:2b,1:0:3,3b:6:2b,1:2:3,b:0:3,c:9:12,33e:1:3,b7:0:2b,2:36:2b,8:3:2b,4e:3:b,1:0:1,c:1:2b,f:17f7:19,9:2ff:19,201:8:19,22f8:122:19,10:0:b,1e:2:b,3:0:b,f:3:b,9:18b:19,9a2:1:2b,1:0:3,1:3:2b,125d:2d:2b,3:16:2b,21f:4:2b,4:15:2b,3:6:2b,1f:3:2b,95:2:2b,58a:31:12,201:36:2b,5:31:2b,9:0:2b,f:0:2b,3:3:3,11:4:2b,2:e:2b,551:6:2b,2:10:2b,3:6:2b,2:1:2b,2:4:2b,65:0:2b,a1:6:2b,a:9:12,165:0:2b,3e:3:2b,1:9:12,6:0:14,1ed:3:2b,1:9:12,3d7:6:2b,6e:6:2b,6:9:12,5:1:c,34d:0:13,4:0:13,350:2b:19,1:3:1a,1:63:19,1:b:1a,1:e:19,1:1:1a,1:e:19,1:0:1a,1:e:19,1:0:1a,1:24:19,1:9:1a,e:2:19,5e:2:19,3e:0:19,1:37:1a,1:19:24,1:2:19,1:c:1a,1:2b:19,1:3:1a,1:8:19,1:6:1a,1:1:19,1:d:1a,1:5:19,1:99:1a,1:84:19,1:0:26,1:15:19,3:16:19,3:4:19,2:4:19,1:2:26,1:1:19,1:0:26,1:1:19,1:2:26,1:2d:19,1:4:27,1:41:19,1:1:26,1:1:19,1:a:26,1:14:19,1:12:26,1:2:19,1:0:26,1:3:19,1:2:26,1:0:19,1:2:26,1:6:19,1:0:26,1:0:19,1:0:26,1:d:19,2:0:19,2:0:19,2:4:19,1:0:26,1:3:19,2:0:19,3:4c:19,8:f:19,f:c:19,19:29:19,1:1:26,1:3:19,1:0:26,1:14:19,1:0:26,1:3:19,1:1:26,1:3c:19,9:17:19,7:4a:19,1:2:26,1:2:19,1:4:26,27:2:e,1:2:b,5:22:19,1:0:26,1:f:19,1:2:26,1:8:19,1:0:26,1:a:19,1:0:26,1:a:19,1:3:1a,1:10:19,1:2:1a,1:c:19,1:2:1a,75:2:19,1:3:1a,1:4:19,56:4:19,1:5:1a,1:b:19,1:3:1a,1:0:19,1:e:1a,d:3:1a,39:7:1a,b:5:1a,29:7:1a,1f:1:1a,1:1:19,1:4d:1a,d:0:26,1:1:19,1:0:26,1:7:19,1:7:26,1:5:19,1:0:26,1:8:19,1:9:26,1:1:19,1:2:26,1:37:19,1:0:26,1:3c:19,1:1:26,1:0:19,1:1:26,1:0:19,1:0:26,1:10:19,1:2:26,1:0:19,1:c:26,1:21:19,55:b:1a,1:d:19,1:1:1a,1:c:19,1:2:1a,1:8:19,1:6:1a,1:2d:19,1:0:1a,1:3:19,1:2:26,1:7:1a,1:d:19,1:3:1a,1:8:19,1:6:1a,1:8:26,1:6:1a,f1:9:12,7:3fd:1a,3:fffd:19,3:fffd:19,a0004:0:2b,1f:5f:2b,81:ef:2b';

const LBP_TABLE = [
  'PIIIIIPPPPIIIIIIPPIIIPIIIIIIIIIIIIIIIIII', 'PIIIIIPPPPIIIIIIPPIIIPIIIIIIIIIIIIIIIIII', 'PIPIDIPPPPIIDDIIPPDDDPDDDDDDDDDDDDDDDDDD', 'PDDIDIPPPPIIDDIIPPDDDPDDDDDDDDDDDDDDDDDD',
  'PIIIIIPPPPIIIIIIPPIIIPIIIIIIIIIIIIIIIIII', 'PDDIDIPPPPIIDDIIPPIDDPDDDDDDDDDDDDDDDDDD', 'PIDIDIPPPPIPDDIIPPDIIPDDDDDDDDDDDDDDDDDD', 'PIDIDIPPPPIIDDIIPPIIIPIDDDDDDDIDDDDDDIDD',
  'PIDIDIPPPPIIDDIIPPDIIPDDDDDDDDDDDDDDDDDD', 'PIDIDIPPPPIIDDIIPPDDDPDDDDDDDDDDDDDDDDDD', 'PIDIDIPPPPIIDDIIPPDDDPDDDDDDDDDDDDDDDDDD', 'PIDIDIPPPPIIDDIIPPDDDPDDDDDDDDDDDDDDDDDD',
  'PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP', 'PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP', 'PIIIIIPPPPIIIIIIPPIIIPIIIIIIIIIIIIIIIIII', 'PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP',
  'PIIIIIPPPPIIIIIIPPIIIPIIIIIIIIIIIIIIIIII', 'PIDIDIPPPPIIDDIIPPIDDPDDDDDDDDDDDDDDDDDD', 'PIDIDIPPPPIIIDIIPPIIIPIDDDDDDDIDDDDDDIDD', 'PIDIDIPPPPIIIIIIPPIDDPIDDDDDDDIDDDDDDIDD',
  'PIDIDIPPPPIIIIIIPPIDDPIIIIIIIIIDDDDDDIII', 'PIDIDIPPPPIIDDIIPPIDDPDDDDDDDDIDDDDDDDDD', 'PIDIDIPPPPIIIDIIPPIIIPIDDDDDDDIDDDDDDIDD', 'PIDIDIPPPPIIDDIIPPDIDPDDDDDDIIDDDDDDDDDD',
  'PIDIDIPPPPIIDDIIPPDIDPDDDDDDDIDDDDDDDDDD', 'PIDIDIPPPPIIDDIIPPDIDPDDDDDDDDDDDDDDDDDD', 'PIDIDIPPPPIIDDIIPPDIDPDDDDDDDDDDDDDDDDDI', 'PIDIDIPPPPIIDDIIPPDIDPDIIDDIIDDDDDDDDDDD',
  'PIDIDIPPPPIIDDIIPPDIDPDDDDDDIIDDDDDDDDDD', 'PIDIDIPPPPIIDDIIPPDIDPDDDDDDDIDDDDDDDDDD', 'PIDIDIPPPPIIIDIIPPIIIPIDDDDDDDIDDDDDDIDD', 'PIDIDIPPPPIIDDIIPPDDDPDDDDDDDDDDDDDDDDDD',
  'PIDIDIPPPPIIDDIIPPDDDPDDDDDDDDDDDDDDDDDD', 'PIDIDIPPPPIIDDIIPPDDDPDDDDDDDDDDDDDDDDDD', 'PIDIDIPPPPIIDDIIPPDDDPDDDDDDDDDDDDDDDDDD', 'PIDIDIPPPPIIDDIIPPDDDPDDDDDDDDDDDDDDDDDD',
  'PIDIDIPPPPIIDDIIPPDDDPDDDDDDDDDDDDDDDDDD', 'PIDIDIPPPPIIIDIIPPIIIPIDDIIDDDIDDDDDDIII', 'PIDIDIPPPPIIDDIIPPDIDPDDDDDDDDDDDDDDDDDI', 'PIDIDIPPPPIIDDIIPPDIDPDDDDDDDDDDDDDDDDDD',
];

const LBP_WIDE_DATA = '1101:5f,11bb:1,e:1,bf:3,4:0,3:0,20a:1,16:1,33:b,2c:0,14:0,e:0,9:1,12:1,6:1,9:0,6:0,16:0,8:1,2:0,5:0,3:0,8:0,5:1,1d:0,24:0,2:0,5:2,2:0,3e:2,19:0,f:0,35c:1,34:0,5:0,32b:1be,2:207,9:1b6f,41:56cf,491:1c,284:2ba3,215d:1ff,311:f,11:3f,91:60,80:6,6ffa:3,d:1,f:17f7,9:4d5,2b:8,22e8:3,2:6,2:1,2:122,2e:2,12:3,9:18b,3d09:0,cb:0,bf:0,3:9,66:120,d:8,2:45,2:15,d:2a,5:4,d:10,4:0,4:46,2:0,2:ba,3:3e,e:3,2:17,13:0,1b:1,e:0,57:54,31:45,7:0,4:2,3:2,6:2,c:1,8:8,e4:b,5:0,11c:2e,2:9,2:b8,71:4,4:4,4:6,a:1c,4:a,6:5,b:9,7:7,9:6,50a:1ffff';

const LBP_NONSPACING_DATA = '1:1f,60:20,e:0,253:6f,114:6,108:2c,2:0,2:1,2:1,2:0,49:a,2:0,2f:14,11:0,66:6,3:5,3:1,2:3,24:0,1f:1a,5c:a,3b:8,a:0,19:3,2:8,2:2,2:4,2c:2,3d:7,2b:17,2:1f,38:0,2:0,5:7,5:0,4:6,b:1,1e:0,3b:0,5:3,9:0,15:1,1b:0,3:1,3a:0,5:1,5:1,3:2,4:0,1f:1,4:0,c:1,3a:0,5:4,2:1,5:0,15:1,17:5,2:0,3b:0,3:0,2:3,9:0,8:1,c:1,1f:0,3e:0,d:0,33:0,4:0,38:0,2:2,6:2,2:3,8:1,c:1,1e:0,3b:0,10:1,15:1,1d:1,3a:1,5:3,9:0,15:1,1e:0,49:0,8:2,2:0,5b:0,3:6,d:7,63:0,3:8,c:6,4a:1,1c:0,2:0,2:0,38:d,2:4,2:1,6:a,2:23,a:0,67:3,2:5,2:1,3:1,1a:1,5:2,11:3,e:0,3:1,7:0,10:0,c3:9f,15e:2,3b3:2,1e:1,1f:1,1f:1,41:1,2:6,9:0,3:a,a:0,2e:4,76:1,23:0,77:2,5:1,a:0,7:2,dc:1,3:0,3b:0,2:6,2:0,2:0,3:7,7:9,3:0,31:1e,32:3,31:0,2:4,2:0,6:0,29:8,d:1,21:3,3:1,2:2,39:0,2:1,4:0,2:2,3b:7,3:1,99:2,2:c,2:6,5:0,7:0,4:1,c7:3f,20c:4,1b:4,32:4,2:9,61:20,bff:2,8e:0,61:1f,22b:3,6c:1,75d5:3,2:9,21:1,51:1,111:0,4:0,5:0,1a:1,6:0,98:1,1b:11,e:0,27:7,1a:a,2f:2,31:0,3:3,3:1,28:0,44:5,3:1,3:1,d:0,9:0,30:0,34:0,2:2,3:1,6:1,2:0,2b:1,9:0,ef:0,3:0,5:0,2bc3:16,5:30,2323:0,2e2:f,11:f,d0:0,fa:2,202:0,e3:0,96:4,687:2,2:1,6:3,29:2,5:0,a6:1,23e:3,184:1,51:2,47:a,32:3,7c:0,37:e,2a:0,3:1,b:2,32:3,3:1,8:0,3e:2,25:4,2:7,3f:0,d:1,35:8,b:3,3:0,60:2,3:0,2:1,7:0,3:0,9e:0,4:7,16:1,3a:1,4:0,26:6,4:4,c4:7,3:2,2:0,18:0,55:5,2:0,5:1,2:1,ef:3,7:1,2:1,1c:1,56:7,3:0,2:1,6b:0,2:0,3:5,2:0,66:2,3:3,2:4,104:8,2:1,101:1,2:0,5:0,91:3,3:1,5:0,21:5,3:1,29:5,3:3,9:0,a:5,3:2,2f:c,2:1,197:6,2:5,55:15,3:6,2:1,2:1,7b:5,4:0,2:1,2:6,2:0,49:1,4:0,2:0,15c:1,c:1,35:4,6:0,2:0,14ee:10,7:e,369b:4,3c:6,419:0,40:3,52:0,4cb9:1,2:3,125d:2d,3:16,221:2,a:f,3:6,1f:3,95:2,7bc:36,5:31,9:0,f:0,17:4,2:e,551:6,2:10,3:6,2:1,2:4,65:0,a1:6,178:0,3e:3,1fd:3,3e1:6,6e:6,c16b7:0,1f:5f,81:ef';


const LBP_CLASSES = decodeRanges(LBP_CLASS_DATA, true);
const LBP_WIDE = decodeRanges(LBP_WIDE_DATA, false);
const LBP_NONSPACING = decodeRanges(LBP_NONSPACING_DATA, false);

// Decodes the range data embedded above. The format is a comma-separated
// list of `gap:length` or `gap:length:class` hex tuples, where `gap` is the
// distance from the end of the previous range.
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

// Line break class of a single code point; anything not covered resolves
// to LBP_AL like LBP_AI / LBP_SA / LBP_XX do at runtime.
function lbpClass (cp) {
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

  return LBP.AL;
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

// Marks candidate break positions in a portion, a port of
// u8_possible_linebreaks_loop() from unilbrk. `chars` is an array of code
// points and `prohibited` a set of indices that must never break.
function possibleLinebreaks (chars, prohibited) {
  const marks = new Array(chars.length).fill(BREAK_PROHIBITED);
  let prevProp = LBP.BK;
  let lastProp = LBP.BK;
  let seenSpace = -1;
  let riCount = 0;

  for (let i = 0; i < chars.length; i++) {
    let prop = lbpClass(chars[i]);

    switch (prop) {
      case LBP.BK:
      case LBP.CR:
      case LBP.LF:
        marks[i] = BREAK_MANDATORY;
        prevProp = prop;
        lastProp = LBP.BK;
        seenSpace = -1;
        riCount = prop === LBP.RI ? riCount + 1 : 0;
        continue;
      case LBP.AI:
        prop = LBP.AL;
        break;
      case LBP.CB:
        prop = LBP.ID1;
        break;
      case LBP.SA:
      case LBP.XX:
        prop = LBP.AL;
        break;
      case LBP.QU2:
        // (LB15a) Replace QU2 with QU1 if the previous character's class was
        // not one of BK, CR, LF, OP, QU, GL, SP, ZW
        switch (prevProp) {
          case LBP.BK:
          case LBP.CR:
          case LBP.LF:
          case LBP.OP1:
          case LBP.OP2:
          case LBP.QU1:
          case LBP.QU2:
          case LBP.QU3:
          case LBP.GL:
          case LBP.SP:
          case LBP.ZW:
            break;
          default:
            prop = LBP.QU1;
        }
        break;
      case LBP.QU3: {
        // (LB15b) Replace QU3 with QU1 if the next character's class is not
        // one of BK, CR, LF, SP, GL, WJ, CL, QU, CP, EX, IS, SY, ZW
        const nextProp = i + 1 < chars.length ? lbpClass(chars[i + 1]) : LBP.BK;

        switch (nextProp) {
          case LBP.BK:
          case LBP.CR:
          case LBP.LF:
          case LBP.SP:
          case LBP.GL:
          case LBP.WJ:
          case LBP.CL:
          case LBP.QU1:
          case LBP.QU2:
          case LBP.QU3:
          case LBP.CP1:
          case LBP.CP2:
          case LBP.EX:
          case LBP.IS:
          case LBP.SY:
          case LBP.ZW:
            break;
          default:
            prop = LBP.QU1;
        }
        break;
      }
    }

    if (prop === LBP.SP) {
      // (LB7) Don't break just before a space
      seenSpace = i;
    } else if (prop === LBP.ZW) {
      // (LB7) Don't break just before a zero-width space
      lastProp = LBP.ZW;
      seenSpace = -1;
    } else if (prop === LBP.CM || prop === LBP.ZWJ) {
      // (LB9) Don't break just before a combining character or zero-width
      // joiner, except after a break, space or zero-width space
      if (lastProp === LBP.BK) {
        lastProp = LBP.AL;
        seenSpace = -1;
      } else if (lastProp === LBP.ZW || seenSpace !== -1) {
        // (LB8, LB18) break after zero-width space or spaces
        marks[i] = BREAK_POSSIBLE;
        lastProp = LBP.AL;
        seenSpace = -1;
      }
    } else {
      if (lastProp === LBP.BK) {
        // (LB4-LB6) Don't break at the beginning of a line
      } else if (lastProp === LBP.ZW) {
        // (LB8) Break after zero-width space
        marks[i] = BREAK_POSSIBLE;
      } else if (prevProp === LBP.ZWJ) {
        // (LB8a) Don't break right after a zero-width joiner
      } else if (lastProp === LBP.RI && prop === LBP.RI) {
        // (LB30a) Break between regional indicators only after an even count
        if (seenSpace !== -1 || riCount % 2 === 0) {
          marks[i] = BREAK_POSSIBLE;
        }
      } else if (prevProp === LBP.HL_BA) {
        // (LB21a) Don't break after Hebrew + hyphen
      } else {
        const t = LBP_TABLE[lastProp][prop];

        if (t === 'D' || (t === 'I' && seenSpace !== -1)) {
          marks[i] = BREAK_POSSIBLE;
        }
      }
      lastProp = prop;
      seenSpace = -1;
    }

    prevProp = prevProp === LBP.HL && (prop === LBP.HY || prop === LBP.BA) ? LBP.HL_BA : prop;
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
