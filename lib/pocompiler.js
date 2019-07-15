const { Buffer } = require('safe-buffer');
const encoding = require('encoding');
const sharedFuncs = require('./shared');
const contentType = require('content-type');

/**
 * Exposes general compiler function. Takes a translation
 * object as a parameter and returns PO object
 *
 * @param {Object} table Translation object
 * @return {Buffer} Compiled PO object
 */
module.exports = function (table, options) {
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

    if (sharedFuncs.HEADERS.has(lowerKey)) {
      result[sharedFuncs.HEADERS.get(lowerKey)] = headers[key];
    } else {
      result[key] = headers[key];
    }

    return result;
  }, {});

  this._table.headers = headers;

  if (!('foldLength' in this._options)) {
    this._options.foldLength = 76;
  }

  if (!('sort' in this._options)) {
    this._options.sort = false;
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

  return lines.join('\n');
};

/**
 * Builds a PO string for a single translation object
 *
 * @param {Object} block Translation object
 * @param {Object} [override] Properties of this object will override `block` properties
 * @return {String} Translation string for a single object
 */
Compiler.prototype._drawBlock = function (block, override = {}) {
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
    response.push(this._addPOString('msgctxt', msgctxt));
  }

  response.push(this._addPOString('msgid', msgid || ''));

  if (msgidPlural) {
    response.push(this._addPOString('msgid_plural', msgidPlural));

    msgstr.forEach((msgstr, i) => {
      response.push(this._addPOString(`msgstr[${i}]`, msgstr || ''));
    });
  } else {
    response.push(this._addPOString('msgstr', msgstr[0] || ''));
  }

  return response.join('\n');
};

/**
 * Escapes and joins a key and a value for the PO string
 *
 * @param {String} key Key name
 * @param {String} value Key value
 * @return {String} Joined and escaped key-value pair
 */
Compiler.prototype._addPOString = function (key = '', value = '') {
  key = key.toString();

  // escape newlines and quotes
  value = value.toString()
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');

  let lines = [value];

  if (this._options.foldLength > 0) {
    lines = sharedFuncs.foldLine(value, this._options.foldLength);
  }

  if (lines.length < 2) {
    return `${key} "${lines.shift() || ''}"`;
  }

  return `${key} ""\n"${lines.join('"\n"')}"`;
};

/**
 * Handles header values, replaces or adds (if needed) a charset property
 */
Compiler.prototype._handleCharset = function () {
  const ct = contentType.parse(this._table.headers['Content-Type'] || 'text/plain');

  const charset = sharedFuncs.formatCharset(this._table.charset || ct.parameters.charset || 'utf-8');

  // clean up content-type charset independently using fallback if missing
  if (ct.parameters.charset) {
    ct.parameters.charset = sharedFuncs.formatCharset(ct.parameters.charset);
  }

  this._table.charset = charset;
  this._table.headers['Content-Type'] = contentType.format(ct);
};

/**
 * Compiles translation object into a PO object
 *
 * @return {Buffer} Compiled PO object
 */
Compiler.prototype.compile = function () {
  const headerBlock = (this._table.translations[''] && this._table.translations['']['']) || {};
  let response = [];

  Object.keys(this._table.translations).forEach(msgctxt => {
    if (typeof this._table.translations[msgctxt] !== 'object') {
      return;
    }

    Object.keys(this._table.translations[msgctxt]).forEach(msgid => {
      if (typeof this._table.translations[msgctxt][msgid] !== 'object') {
        return;
      }

      if (msgctxt === '' && msgid === '') {
        return;
      }

      response.push(this._table.translations[msgctxt][msgid]);
    });
  });

  if (this._options.sort !== false) {
    if (typeof this._options.sort === 'function') {
      response = response.sort(this._options.sort);
    } else {
      response = response.sort(sharedFuncs.compareMsgid);
    }
  }

  response = response.map(r => this._drawBlock(r));

  response.unshift(this._drawBlock(headerBlock, {
    msgstr: sharedFuncs.generateHeader(this._table.headers)
  }));

  if (this._table.charset === 'utf-8' || this._table.charset === 'ascii') {
    return Buffer.from(response.join('\n\n'), 'utf-8');
  }

  return encoding.convert(response.join('\n\n'), this._table.charset);
};
