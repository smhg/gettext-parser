import encoding from 'encoding';
import { HEADERS, formatCharset, generateHeader, compareMsgid } from './shared.js';
import contentType from 'content-type';

/**
 * @typedef {import('node:stream').Transform} Transform
 * @typedef {import('./types.js').GetTextTranslation} GetTextTranslation
 * @typedef {import('./types.js').GetTextTranslations} GetTextTranslations
 * @typedef {import('./types.js').Translations} Translations
 * @typedef {import('./types.js').WriteFunc} WriteFunc
 */

/**
 * @typedef {Object} Size Data about the size of the compiled MO object.
 * @property {number} msgid The size of the msgid section.
 * @property {number} msgstr The size of the msgstr section.
 * @property {number} total The total size of the compiled MO object.
 */

/**
 * @typedef {{ msgid: Buffer, msgstr: Buffer }} InProgressTranslation A translation object partially parsed.
 */

/**
 * Exposes general compiler function. Takes a translation
 * object as a parameter and returns binary MO object
 *
 * @param {GetTextTranslations} table Translation object
 * @return {Buffer} Compiled binary MO object
 */
export default function (table) {
  const compiler = new Compiler(table);

  return compiler.compile();
}

/**
 * Prepare the header object to be compatible with MO compiler
 * @param {Record<string, string>} headers the headers
 * @return {Record<string, string>} The prepared header
 */
function prepareMoHeaders (headers) {
  return Object.keys(headers).reduce((result, key) => {
    const lowerKey = key.toLowerCase();

    if (HEADERS.has(lowerKey)) {
      // POT-Creation-Date is removed in MO (see https://savannah.gnu.org/bugs/?49654)
      if (lowerKey !== 'pot-creation-date') {
        const value = HEADERS.get(lowerKey);
        if (value) {
          result[value] = headers[key];
        }
      }
    } else {
      result[key] = headers[key];
    }

    return result;
  }, /** @type {Record<string, string>} */ ({}));
}

/**
 * Prepare the translation object to be compatible with MO compiler
 * @param {Translations} translations
 * @return {Translations}
 */
function prepareTranslations (translations) {
  return Object.keys(translations).reduce((result, msgctxt) => {
    const context = translations[msgctxt];
    const msgs = Object.keys(context).reduce((result, msgid) => {
      const TranslationMsgstr = context[msgid].msgstr;
      const hasTranslation = TranslationMsgstr.some(item => !!item.length);

      if (hasTranslation) {
        result[msgid] = context[msgid];
      }

      return result;
    }, /** @type {Record<string, GetTextTranslation>} */({}));

    if (Object.keys(msgs).length) {
      result[msgctxt] = msgs;
    }

    return result;
  }, /** @type {Translations} */({}));
}

/**
 * Creates a MO compiler object.
 * @this {Compiler & Transform}
 *
 * @param {GetTextTranslations} [table] Translation table as defined in the README
 */
function Compiler (table) {
  /** @type {GetTextTranslations} _table The translation table */
  this._table = {
    charset: undefined,
    translations: prepareTranslations(table?.translations ?? {}),
    headers: prepareMoHeaders(table?.headers ?? {})
  };

  this._translations = [];
  /**
   * @type {WriteFunc}
   */
  this._writeFunc = 'writeUInt32LE';

  this._handleCharset();

  /**
   * Magic bytes for the generated binary data
   * @type {number} MAGIC file header magic value of mo file
   */
  this.MAGIC = 0x950412de;
}

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
 * Generates an array of translation strings
 * in the form of [{msgid:..., msgstr: ...}]
 *
 */
Compiler.prototype._generateList = function () {
  /** @type {InProgressTranslation[]} */
  const list = [];

  if ('headers' in this._table) {
    list.push({
      msgid: Buffer.alloc(0),
      msgstr: encoding.convert(generateHeader(this._table.headers), this._table.charset)
    });
  }

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

      const value = /** @type {string[]} */([]).concat(this._table.translations[msgctxt][msgid].msgstr ?? []).join('\u0000');

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
 * @param {InProgressTranslation[]} list An array of translation strings from _generateList
 * @return {Size} Size data of {msgid, msgstr, total}
 */
Compiler.prototype._calculateSize = function (list) {
  let msgidLength = 0;
  let msgstrLength = 0;

  list.forEach(translation => {
    msgidLength += translation.msgid.length + 1; // + extra 0x00
    msgstrLength += translation.msgstr.length + 1; // + extra 0x00
  });

  const totalLength = 4 + // magic number
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
 * @param {GetTextTranslation[]} list translation list
 *  @param {Size} size Byte size information
 *  @return {Buffer} Compiled MO object
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

  // Build original table
  curPosition = 28 + 2 * (4 + 4) * list.length;
  for (i = 0, len = list.length; i < len; i++) {
    const msgidLength = /** @type {Buffer} */(/** @type {unknown} */(list[i].msgid));
    msgidLength.copy(returnBuffer, curPosition);
    returnBuffer.writeUInt32LE(list[i].msgid.length, 28 + i * 8);
    returnBuffer.writeUInt32LE(curPosition, 28 + i * 8 + 4);
    returnBuffer[curPosition + list[i].msgid.length] = 0x00;
    curPosition += list[i].msgid.length + 1;
  }

  // build translation table
  for (i = 0, len = list.length; i < len; i++) {
    const msgstrLength = /** @type {Buffer} */(/** @type {unknown} */(list[i].msgstr));
    msgstrLength.copy(returnBuffer, curPosition);
    returnBuffer.writeUInt32LE(list[i].msgstr.length, 28 + (4 + 4) * list.length + i * 8);
    returnBuffer.writeUInt32LE(curPosition, 28 + (4 + 4) * list.length + i * 8 + 4);
    returnBuffer[curPosition + list[i].msgstr.length] = 0x00;
    curPosition += list[i].msgstr.length + 1;
  }

  return returnBuffer;
};

/**
 * Compiles a translation object into a binary MO object
 *
 * @interface
 * @return {Buffer} Compiled MO object
 */
Compiler.prototype.compile = function () {
  const list = this._generateList();
  const size = this._calculateSize(list);

  list.sort(compareMsgid);

  return this._build(list, size);
};
