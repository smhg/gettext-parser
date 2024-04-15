import { Buffer } from 'safe-buffer';
import encoding from 'encoding';
import { HEADERS, foldLine, compareMsgid, formatCharset, generateHeader } from './shared.js';
import contentType from 'content-type';

/**
 * Exposes general compiler function. Takes a translation
 * object as a parameter and returns PO object
 *
 * @param {Object} table Translation object
 * @return {Buffer} Compiled PO object
 */
export default function (table, options) {
  const compiler = new Compiler(table, options);

  return compiler.compile();
};

/**
 * Creates a PO compiler object.
 *
 * @constructor
 * @param {Object} table Translation table to be compiled
 */
function Compiler (table = {}, options = {}) {
  this._table = table;
  this._options = options;

  this._table.translations = this._table.translations || {};

  let { headers = {} } = this._table;

  headers = Object.keys(headers).reduce((result, key) => {
    const lowerKey = key.toLowerCase();

    if (HEADERS.has(lowerKey)) {
      result[HEADERS.get(lowerKey)] = headers[key];
    } else {
      result[key] = headers[key];
    }

    return result;
  }, {});

  this._table.headers = headers;

  if (!('foldLength' in this._options)) {
    this._options.foldLength = 76;
  }

  if (!('escapeCharacters' in this._options)) {
    this._options.escapeCharacters = true;
  }

  if (!('sort' in this._options)) {
    this._options.sort = false;
  }

  if (!('eol' in this._options)) {
    this._options.eol = '\n';
  }

  this._translations = [];

  this._handleCharset();
}

/**
 * Converts a comments object to a comment string. The comment object is
 * in the form of {translator:'', reference: '', extracted: '', flag: '', previous:''}
 *
 * @param {Object} comments A comments object
 * @return {String} A comment string for the PO file
 */
Compiler.prototype._drawComments = function (comments) {
  const lines = [];
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

  types.forEach(type => {
    if (!comments[type.key]) {
      return;
    }

    comments[type.key].split(/\r?\n|\r/).forEach(line => {
      lines.push(`${type.prefix}${line}`);
    });
  });

  return lines.join(this._options.eol);
};

/**
 * Builds a PO string for a single translation object
 *
 * @param {Object} block Translation object
 * @param {Object} [override] Properties of this object will override `block` properties
 * @param {boolean} [obsolete] Block is obsolete and must be commented out
 * @return {String} Translation string for a single object
 */
Compiler.prototype._drawBlock = function (block, override = {}, obsolete = false) {
  const response = [];
  const msgctxt = override.msgctxt || block.msgctxt;
  const msgid = override.msgid || block.msgid;
  const msgidPlural = override.msgid_plural || block.msgid_plural;
  const msgstr = [].concat(override.msgstr || block.msgstr);
  let comments = override.comments || block.comments;

  // add comments
  if (comments && (comments = this._drawComments(comments))) {
    response.push(comments);
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
 * @param {String} key Key name
 * @param {String} value Key value
 * @param {boolean} [obsolete] PO string is obsolete and must be commented out
 * @return {String} Joined and escaped key-value pair
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

  if (foldLength > 0) {
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
  const ct = contentType.parse(this._table.headers['Content-Type'] || 'text/plain');

  const charset = formatCharset(this._table.charset || ct.parameters.charset || 'utf-8');

  // clean up content-type charset independently using fallback if missing
  if (ct.parameters.charset) {
    ct.parameters.charset = formatCharset(ct.parameters.charset);
  }

  this._table.charset = charset;
  this._table.headers['Content-Type'] = contentType.format(ct);
};

/**
 * Flatten and sort translations object
 *
 * @param {Object} section Object to be prepared (translations or obsolete)
 * @returns {Array} Prepared array
 */
Compiler.prototype._prepareSection = function (section) {
  let response = [];

  Object.keys(section).forEach(msgctxt => {
    if (typeof section[msgctxt] !== 'object') {
      return;
    }

    Object.keys(section[msgctxt]).forEach(msgid => {
      if (typeof section[msgctxt][msgid] !== 'object') {
        return;
      }

      if (msgctxt === '' && msgid === '') {
        return;
      }

      response.push(section[msgctxt][msgid]);
    });
  });

  const { sort } = this._options;

  if (sort !== false) {
    if (typeof sort === 'function') {
      response = response.sort(sort);
    } else {
      response = response.sort(compareMsgid);
    }
  }

  return response;
};

/**
 * Compiles translation object into a PO object
 *
 * @return {Buffer} Compiled PO object
 */
Compiler.prototype.compile = function () {
  const headerBlock = (this._table.translations[''] && this._table.translations['']['']) || {};
  let response = [];

  const translations = this._prepareSection(this._table.translations);
  response = translations.map(r => this._drawBlock(r));

  if (typeof this._table.obsolete === 'object') {
    const obsolete = this._prepareSection(this._table.obsolete);
    if (obsolete.length) {
      response = response.concat(obsolete.map(r => this._drawBlock(r, {}, true)));
    }
  }

  const { eol } = this._options;

  response.unshift(this._drawBlock(headerBlock, {
    msgstr: generateHeader(this._table.headers)
  }));

  if (this._table.charset === 'utf-8' || this._table.charset === 'ascii') {
    return Buffer.from(response.join(eol + eol) + eol, 'utf-8');
  }

  return encoding.convert(response.join(eol + eol) + eol, this._table.charset);
};
