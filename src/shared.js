// see https://www.gnu.org/software/gettext/manual/html_node/Header-Entry.html
/** @type {string} Header name for "Plural-Forms" */
const PLURAL_FORMS = 'Plural-Forms';
/** @typedef {Map<string, string>} Headers Map of header keys to header names */
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
 * @param {string} str Header string
 * @return {{[key: string]: string}} An object of key-value pairs
 */
export function parseHeader (str = '') {
  /** @type {string} Header string  */
  return str
    .split('\n')
    .reduce((/** @type {Record<string, string>} */ headers, line) => {
      const parts = line.split(':');
      let key = (parts.shift() || '').trim();

      if (key) {
        const value = parts.join(':').trim();

        key = HEADERS.get(key.toLowerCase()) || key;

        headers[key] = value;
      }

      return headers;
    }, {});
}

/**
 * Attempts to safely parse 'nplurals" value from "Plural-Forms" header
 *
 * @param {{[key: string]: string}} [headers] An object with parsed headers
 * @param {number} fallback Fallback value if "Plural-Forms" header is absent
 * @returns {number} Parsed result
 */
export function parseNPluralFromHeadersSafely (headers, fallback = 1) {
  const pluralForms = headers ? headers[PLURAL_FORMS] : false;

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
 * @param {{[key: string]: string}} header Object of key value pairs
 * @return {string} An object of key-value pairs
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
 * @param {string} charset Charset name
 * @param {string} defaultCharset Default charset name, defaults to 'iso-8859-1'
 * @return {string} Normalized charset name
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

/**
 * Folds long lines according to PO format
 *
 * @param {String} str PO formatted string to be folded
 * @param {Number} [maxLen=76] Maximum allowed length for folded lines
 * @return {string[]} An array of lines
 */
export function foldLine (str, maxLen = 76) {
  const lines = [];
  const len = str.length;
  let curLine = '';
  let pos = 0;
  let match;

  while (pos < len) {
    curLine = str.substr(pos, maxLen);

    // ensure that the line never ends with a partial escaping
    // make longer lines if needed
    while (curLine.substr(-1) === '\\' && pos + curLine.length < len) {
      curLine += str.charAt(pos + curLine.length);
    }

    // ensure that if possible, line breaks are done at reasonable places
    if ((match = /.*?\\n/.exec(curLine))) {
      // use everything before and including the first line break
      curLine = match[0];
    } else if (pos + curLine.length < len) {
      // if we're not at the end
      if ((match = /.*\s+/.exec(curLine)) && /\S/.test(match[0])) {
        // use everything before and including the last white space character (if anything)
        curLine = match[0];
      } else if ((match = /.*[\x21-\x2f0-9\x5b-\x60\x7b-\x7e]+/.exec(curLine)) && /[^\x21-\x2f0-9\x5b-\x60\x7b-\x7e]/.test(match[0])) {
        // use everything before and including the last "special" character (if anything)
        curLine = match[0];
      }
    }

    lines.push(curLine);
    pos += curLine.length;
  }

  return lines;
}

/**
 * Comparator function for comparing msgid
 *
 * @param {{msgid: string}} left with msgid prev
 * @param {{msgid: string}} right with msgid next
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

/**
 * Custom SyntaxError subclass that includes the lineNumber property.
 */
export class ParserError extends SyntaxError {
  /**
   * @param {string} message - Error message.
   * @param {number} lineNumber - Line number where the error occurred.
   */
  constructor (message, lineNumber) {
    super(message);
    this.lineNumber = lineNumber;
  }
}
