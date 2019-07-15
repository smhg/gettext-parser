const { Buffer } = require('safe-buffer');
const encoding = require('encoding');
const sharedFuncs = require('./shared');
const contentType = require('content-type');

/**
 * Exposes general compiler function. Takes a translation
 * object as a parameter and returns binary MO object
 *
 * @param {Object} table Translation object
 * @return {Buffer} Compiled binary MO object
 */
module.exports = function (table) {
  const compiler = new Compiler(table);

  return compiler.compile();
};

/**
 * Creates a MO compiler object.
 *
 * @constructor
 * @param {Object} table Translation table as defined in the README
 */
function Compiler (table = {}) {
  this._table = table;

  let { headers = {}, translations = {} } = this._table;

  headers = Object.keys(headers).reduce((result, key) => {
    const lowerKey = key.toLowerCase();

    if (sharedFuncs.HEADERS.has(lowerKey)) {
      // POT-Creation-Date is removed in MO (see https://savannah.gnu.org/bugs/?49654)
      if (lowerKey !== 'pot-creation-date') {
        result[sharedFuncs.HEADERS.get(lowerKey)] = headers[key];
      }
    } else {
      result[key] = headers[key];
    }

    return result;
  }, {});

  // filter out empty translations
  translations = Object.keys(translations).reduce((result, msgctxt) => {
    const context = translations[msgctxt];
    const msgs = Object.keys(context).reduce((result, msgid) => {
      const hasTranslation = context[msgid].msgstr.some(item => !!item.length);

      if (hasTranslation) {
        result[msgid] = context[msgid];
      }

      return result;
    }, {});

    if (Object.keys(msgs).length) {
      result[msgctxt] = msgs;
    }

    return result;
  }, {});

  this._table.translations = translations;
  this._table.headers = headers;

  this._translations = [];

  this._writeFunc = 'writeUInt32LE';

  this._handleCharset();
}

/**
 * Magic bytes for the generated binary data
 */
Compiler.prototype.MAGIC = 0x950412de;

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
 * Generates an array of translation strings
 * in the form of [{msgid:... , msgstr:...}]
 *
 * @return {Array} Translation strings array
 */
Compiler.prototype._generateList = function () {
  const list = [];

  list.push({
    msgid: Buffer.alloc(0),
    msgstr: encoding.convert(sharedFuncs.generateHeader(this._table.headers), this._table.charset)
  });

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

      const msgidPlural = this._table.translations[msgctxt][msgid].msgid_plural;
      let key = msgid;

      if (msgctxt) {
        key = msgctxt + '\u0004' + key;
      }

      if (msgidPlural) {
        key += '\u0000' + msgidPlural;
      }

      const value = [].concat(this._table.translations[msgctxt][msgid].msgstr || []).join('\u0000');

      list.push({
        msgid: encoding.convert(key, this._table.charset),
        msgstr: encoding.convert(value, this._table.charset)
      });
    });
  });

  return list;
};

/**
 * Calculate buffer size for the final binary object
 *
 * @param {Array} list An array of translation strings from _generateList
 * @return {Object} Size data of {msgid, msgstr, total}
 */
Compiler.prototype._calculateSize = function (list) {
  let msgidLength = 0;
  let msgstrLength = 0;
  let totalLength = 0;

  list.forEach(translation => {
    msgidLength += translation.msgid.length + 1; // + extra 0x00
    msgstrLength += translation.msgstr.length + 1; // + extra 0x00
  });

  totalLength = 4 + // magic number
        4 + // revision
        4 + // string count
        4 + // original string table offset
        4 + // translation string table offset
        4 + // hash table size
        4 + // hash table offset
        (4 + 4) * list.length + // original string table
        (4 + 4) * list.length + // translations string table
        msgidLength + // originals
        msgstrLength; // translations

  return {
    msgid: msgidLength,
    msgstr: msgstrLength,
    total: totalLength
  };
};

/**
 * Generates the binary MO object from the translation list
 *
 * @param {Array} list translation list
 * @param {Object} size Byte size information
 * @return {Buffer} Compiled MO object
 */
Compiler.prototype._build = function (list, size) {
  const returnBuffer = Buffer.alloc(size.total);
  let curPosition = 0;
  let i;
  let len;

  // magic
  returnBuffer[this._writeFunc](this.MAGIC, 0);

  // revision
  returnBuffer[this._writeFunc](0, 4);

  // string count
  returnBuffer[this._writeFunc](list.length, 8);

  // original string table offset
  returnBuffer[this._writeFunc](28, 12);

  // translation string table offset
  returnBuffer[this._writeFunc](28 + (4 + 4) * list.length, 16);

  // hash table size
  returnBuffer[this._writeFunc](0, 20);

  // hash table offset
  returnBuffer[this._writeFunc](28 + (4 + 4) * list.length * 2, 24);

  // build originals table
  curPosition = 28 + 2 * (4 + 4) * list.length;
  for (i = 0, len = list.length; i < len; i++) {
    list[i].msgid.copy(returnBuffer, curPosition);
    returnBuffer[this._writeFunc](list[i].msgid.length, 28 + i * 8);
    returnBuffer[this._writeFunc](curPosition, 28 + i * 8 + 4);
    returnBuffer[curPosition + list[i].msgid.length] = 0x00;
    curPosition += list[i].msgid.length + 1;
  }

  // build translations table
  for (i = 0, len = list.length; i < len; i++) {
    list[i].msgstr.copy(returnBuffer, curPosition);
    returnBuffer[this._writeFunc](list[i].msgstr.length, 28 + (4 + 4) * list.length + i * 8);
    returnBuffer[this._writeFunc](curPosition, 28 + (4 + 4) * list.length + i * 8 + 4);
    returnBuffer[curPosition + list[i].msgstr.length] = 0x00;
    curPosition += list[i].msgstr.length + 1;
  }

  return returnBuffer;
};

/**
 * Compiles translation object into a binary MO object
 *
 * @return {Buffer} Compiled MO object
 */
Compiler.prototype.compile = function () {
  const list = this._generateList();
  const size = this._calculateSize(list);

  list.sort(sharedFuncs.compareMsgid);

  return this._build(list, size);
};
