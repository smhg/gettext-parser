import encoding from 'encoding';
import { formatCharset, parseHeader } from './shared.js';

/**
 * Parses a binary MO object into translation table
 *
 * @param {Buffer} buffer Binary MO object
 * @param {String} [defaultCharset] Default charset to use
 * @return {Object} Translation object
 */
export default function (buffer, defaultCharset) {
  const parser = new Parser(buffer, defaultCharset);

  return parser.parse();
}

/**
 * Creates a MO parser object.
 *
 * @constructor
 * @param {Buffer|null} fileContents Binary MO object
 * @param {String} [defaultCharset] Default charset to use
 */
function Parser (fileContents, defaultCharset = 'iso-8859-1') {
  this._fileContents = fileContents;

  this._charset = defaultCharset;

  /**
   * Translation table
   *
   * @type {import('./types.js').GetTextTranslations} table Translation object
   */
  this._table = {
    charset: this._charset,
    headers: {},
    translations: {}
  };

  /**
   * Magic constant to check the endianness of the input file
   */
  this.MAGIC = 0x950412de;
}

/**
 * Checks if number values in the input file are in big- or little endian format.
 *
 * @return {Boolean} Return true if magic was detected
 */
Parser.prototype._checkMagick = function () {
  if (this._fileContents?.readUInt32LE(0) === this.MAGIC) {
    this._readFunc = 'readUInt32LE';
    this._writeFunc = 'writeUInt32LE';

    return true;
  } else if (this._fileContents?.readUInt32BE(0) === this.MAGIC) {
    this._readFunc = 'readUInt32BE';
    this._writeFunc = 'writeUInt32BE';

    return true;
  }

  return false;
};

/**
 * Read the original strings and translations from the input MO file.
 * Use the first translation string in the file as the header.
 */
Parser.prototype._loadTranslationTable = function () {
  let offsetOriginals = this._offsetOriginals || 0;
  let offsetTranslations = this._offsetTranslations || 0;
  let position;
  let length;
  let msgid;
  let msgstr;

  if (this._total) {
    for (let i = 0; i < this._total; i++) {
      if (this._fileContents === null) continue;
      // msgid string
      length = this._fileContents.readUInt32LE(offsetOriginals);
      offsetOriginals += 4;
      position = this._fileContents.readUInt32LE(offsetOriginals);
      offsetOriginals += 4;
      msgid = this._fileContents.subarray(
        position,
        position + length
      );

      // matching msgstr
      length = this._fileContents.readUInt32LE(offsetTranslations);
      offsetTranslations += 4;
      position = this._fileContents.readUInt32LE(offsetTranslations);
      offsetTranslations += 4;
      msgstr = this._fileContents.subarray(
        position,
        position + length
      );

      if (!i && !msgid.toString()) {
        this._handleCharset(msgstr);
      }

      msgid = encoding.convert(msgid, 'utf-8', this._charset)
        .toString('utf8');
      msgstr = encoding.convert(msgstr, 'utf-8', this._charset)
        .toString('utf8');

      this._addString(msgid, msgstr);
    }
  }

  // dump the file contents object
  this._fileContents = null;
};

/**
 * Detects charset for MO strings from the header
 *
 * @param {Buffer} headers Header value
 */
Parser.prototype._handleCharset = function (headers) {
  const headersStr = headers.toString();
  let match;

  if ((match = headersStr.match(/[; ]charset\s*=\s*([\w-]+)/i))) {
    this._charset = this._table.charset = formatCharset(match[1], this._charset);
  }

  headers = encoding.convert(headers, 'utf-8', this._charset);

  this._table.headers = parseHeader(headers.toString('utf8'));
};

/**
 * Adds a translation to the translation object
 *
 * @param {String} msgidRaw Original string
 * @param {String} msgstrRaw Translation for the original string
 */
Parser.prototype._addString = function (msgidRaw, msgstrRaw) {
  const translation = {};
  let msgctxt = '';
  let msgidPlural;

  const msgidArray = msgidRaw.split('\u0004');
  if (msgidArray.length > 1) {
    msgctxt = msgidArray.shift() || '';
    translation.msgctxt = msgctxt;
  }
  msgidRaw = msgidArray.join('\u0004');

  const parts = msgidRaw.split('\u0000');
  const msgid = parts.shift() || '';

  translation.msgid = msgid;

  if ((msgidPlural = parts.join('\u0000'))) {
    translation.msgid_plural = msgidPlural;
  }

  const msgstr = msgstrRaw.split('\u0000');
  translation.msgstr = [...msgstr];

  if (!this._table.translations[msgctxt]) {
    this._table.translations[msgctxt] = {};
  }

  this._table.translations[msgctxt][msgid] = translation;
};

/**
 * Parses the MO object and returns translation table
 *
 * @return {import("./types.js").GetTextTranslations | false} Translation table
 */
Parser.prototype.parse = function () {
  if (!this._checkMagick() || this._fileContents === null) {
    return false;
  }

  /**
   * GetText revision nr, usually 0
   */
  this._revision = this._fileContents.readUInt32LE(4);

  /**
   * @type {number} Total count of translated strings
   */
  this._total = this._fileContents.readUInt32LE(8) ?? 0;

  /**
   * @type {number} Offset position for original strings table
   */
  this._offsetOriginals = this._fileContents.readUInt32LE(12);

  /**
   * @type {number} Offset position for translation strings table
   */
  this._offsetTranslations = this._fileContents.readUInt32LE(16);

  // Load translations into this._translationTable
  this._loadTranslationTable();

  return this._table;
};
