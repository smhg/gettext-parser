import { HEADERS, foldLine, compareMsgid, formatCharset, generateHeader } from './shared.js';
import contentType from 'content-type';

import encoding from 'encoding';

/**
 * @typedef {import('./types.js').GetTextTranslations} GetTextTranslations
 * @typedef {import('./types.js').GetTextTranslation} GetTextTranslation
 * @typedef {import('./types.js').GetTextComment} GetTextComment
 * @typedef {import('./types.js').Translations} Translations
 * @typedef {import('./types.js').ParserOptions} ParserOptions
 */

/**
 * @typedef {Partial<Omit<GetTextTranslation, 'msgstr'>> & { msgstr?: string | string[] }} PreOutputTranslation
 */

/**
 * Exposes general compiler function. Takes a translation
 * object as a parameter and returns PO object
 *
 * @param {GetTextTranslations} table Translation object
 * @param {ParserOptions} [options] Options
 * @return {Buffer} The compiled PO object
 */
export default function (table, options) {
  const compiler = new Compiler(table, options);

  return compiler.compile();
}

/**
 * Takes the header object and converts all headers into the lowercase format
 *
 * @param {Record<string, string>} headersRaw the headers to prepare
 * @returns {Record<string, string>} the headers in the lowercase format
 */
export function preparePoHeaders (headersRaw) {
  return Object.keys(headersRaw).reduce((result, key) => {
    const lowerKey = key.toLowerCase();
    const value = HEADERS.get(lowerKey);

    if (typeof value === 'string') {
      result[value] = headersRaw[key];
    } else {
      result[key] = headersRaw[key];
    }

    return result;
  }, /** @type {Record<string, string>} */ ({}));
}

/**
 * Creates a PO compiler object.
 *
 * @constructor
 * @param {GetTextTranslations} [table] Translation table to be compiled
 * @param {ParserOptions} [options] Options
 */
function Compiler (table, options) {
  this._table = table ?? {
    headers: {},
    charset: undefined,
    translations: {}
  };
  this._table.translations = { ...this._table.translations };

  /** @type {ParserOptions} _options The Options object */
  this._options = {
    foldLength: 76,
    escapeCharacters: true,
    sort: false,
    eol: '\n',
    ...options
  };

  /** @type {Record<string, string>}} the translation table */
  this._table.headers = preparePoHeaders(this._table.headers ?? {});

  this._translations = [];

  this._handleCharset();
}

/**
 * Converts a comment object to a comment string. The comment object is
 * in the form of {translator: '', reference: '', extracted: '', flag: '', previous: ''}
 *
 * @param {Record<string, string>} comments A comments object
 * @return {string} A comment string for the PO file
 */
Compiler.prototype._drawComments = function (comments) {
  /** @var {Record<string, string[]>[]} lines The comment lines to be returned */
  const lines = [];
  /** @var {{key: GetTextComment, prefix: string}} type The comment type */
  const types = [{
    key: 'translator',
    prefix: '# '
  }, {
    key: 'reference',
    prefix: '#: '
  }, {
    key: 'extracted',
    prefix: '#. '
  }, {
    key: 'flag',
    prefix: '#, '
  }, {
    key: 'previous',
    prefix: '#| '
  }];

  for (const type of types) {
    /** @var {string} value The comment type */
    const value = type.key;

    // ignore empty comments
    if (!(value in comments)) { continue; }

    const commentLines = comments[value].split(/\r?\n|\r/);

    // add comment lines to comments Array
    for (const line of commentLines) {
      lines.push(`${type.prefix}${line}`);
    }
  }

  return lines.length ? lines.join(this._options.eol) : '';
};

/**
 * Builds a PO string for a single translation object
 *
 * @param {PreOutputTranslation} block Translation object
 * @param {Partial<PreOutputTranslation>} [override] Properties of this object will override `block` properties
 * @param {boolean} [obsolete] Block is obsolete and must be commented out
 * @return {string} Translation string for a single object
 */
Compiler.prototype._drawBlock = function (block, override = {}, obsolete = false) {
  const response = [];
  const msgctxt = override.msgctxt || block.msgctxt;
  const msgid = override.msgid || block.msgid;
  const msgidPlural = override.msgid_plural || block.msgid_plural;
  const msgstrData = override.msgstr || block.msgstr;
  const msgstr = Array.isArray(msgstrData) ? [...msgstrData] : [msgstrData];

  /** @type {GetTextComment|undefined} */
  const comments = override.comments || block.comments;
  if (comments) {
    const drawnComments = this._drawComments(comments);
    if (drawnComments) {
      response.push(drawnComments);
    }
  }

  if (msgctxt) {
    response.push(this._addPOString('msgctxt', msgctxt, obsolete));
  }

  response.push(this._addPOString('msgid', msgid || '', obsolete));

  if (msgidPlural) {
    response.push(this._addPOString('msgid_plural', msgidPlural, obsolete));

    msgstr.forEach((msgstr, i) => {
      response.push(this._addPOString(`msgstr[${i}]`, msgstr || '', obsolete));
    });
  } else {
    response.push(this._addPOString('msgstr', msgstr[0] || '', obsolete));
  }

  return response.join(this._options.eol);
};

/**
 * Escapes and joins a key and a value for the PO string
 *
 * @param {string} key Key name
 * @param {string} value Key value
 * @param {boolean} [obsolete] PO string is obsolete and must be commented out
 * @return {string} Joined and escaped key-value pair
 */
Compiler.prototype._addPOString = function (key = '', value = '', obsolete = false) {
  key = key.toString();
  if (obsolete) {
    key = '#~ ' + key;
  }

  let { foldLength, eol, escapeCharacters } = this._options;

  // escape newlines and quotes
  if (escapeCharacters) {
    value = value.toString()
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\t/g, '\\t')
      .replace(/\r/g, '\\r');
  }

  value = value.replace(/\n/g, '\\n'); // need to escape new line characters regardless

  let lines = [value];

  if (obsolete) {
    eol = eol + '#~ ';
  }

  if (foldLength && foldLength > 0) {
    lines = foldLine(value, foldLength);
  } else {
    // split only on new lines
    if (escapeCharacters) {
      lines = value.split(/\\n/g);
      for (let i = 0; i < lines.length - 1; i++) {
        lines[i] = `${lines[i]}\\n`;
      }
      if (lines.length && lines[lines.length - 1] === '') {
        lines.splice(-1, 1);
      }
    }
  }

  if (lines.length < 2) {
    return `${key} "${lines.shift() || ''}"`;
  }

  return `${key} ""${eol}"${lines.join(`"${eol}"`)}"`;
};

/**
 * Handles header values, replaces or adds (if needed) a charset property
 */
Compiler.prototype._handleCharset = function () {
  if (this._table.headers) {
    const ct = contentType.parse(this._table.headers['Content-Type'] || 'text/plain');

    const charset = formatCharset(this._table.charset || ct.parameters.charset || 'utf-8');

    // clean up content-type charset independently using fallback if missing
    if (ct.parameters.charset) {
      ct.parameters.charset = formatCharset(ct.parameters.charset);
    }

    this._table.charset = charset;
    this._table.headers['Content-Type'] = contentType.format(ct);
  }
};

/**
 * Flatten and sort translations object
 *
 * @param {Translations} section Object to be prepared (translations or obsolete)
 * @returns {PreOutputTranslation[]|undefined} Prepared array
 */
Compiler.prototype._prepareSection = function (section) {
  /** @type {GetTextTranslation[]} response Prepared array */
  let response = [];

  for (const msgctxt in section) {
    if (typeof section[msgctxt] !== 'object') {
      return;
    }

    for (const msgid of Object.keys(section[msgctxt])) {
      if (typeof section[msgctxt][msgid] !== 'object') {
        continue;
      }

      if (msgctxt === '' && msgid === '') {
        continue;
      }

      response.push(section[msgctxt][msgid]);
    }
  }

  const { sort } = this._options;

  if (sort) {
    if (typeof sort === 'function') {
      response = response.sort(sort);
    } else {
      response = response.sort(compareMsgid);
    }
  }

  return response;
};

/**
 * Compiles a translation object into a PO object
 *
 * @interface
 * @return {Buffer} Compiled a PO object
 */
Compiler.prototype.compile = function () {
  if (!this._table.translations) {
    throw new Error('No translations found');
  }
  /** @type {PreOutputTranslation} headerBlock */
  const headerBlock = (this._table.translations[''] && this._table.translations['']['']) || {};

  const translations = this._prepareSection(this._table.translations);
  let response = /** @type {(PreOutputTranslation|string)[]} */ (/** @type {unknown[]} */ (translations?.map(t => this._drawBlock(t))));

  if (typeof this._table.obsolete === 'object') {
    const obsolete = this._prepareSection(this._table.obsolete);
    if (obsolete && obsolete.length) {
      response = response?.concat(obsolete.map(r => this._drawBlock(r, {}, true)));
    }
  }

  const eol = this._options.eol ?? '\n';

  response?.unshift(this._drawBlock(headerBlock, {
    msgstr: generateHeader(this._table.headers)
  }));

  if (this._table.charset === 'utf-8' || this._table.charset === 'ascii') {
    return Buffer.from(response?.join(eol + eol) + eol, 'utf-8');
  }

  return encoding.convert(response?.join(eol + eol) + eol, this._table.charset);
};
