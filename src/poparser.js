import encoding from 'encoding';
import { formatCharset, parseHeader, parseNPluralFromHeadersSafely, ParserError } from './shared.js';
import { Transform } from 'readable-stream';
import util from 'util';

/**
 * Po parser options
 * @typedef {{ defaultCharset?: string, validation?: boolean }} Options Po parser options
 *
 * The single Node object in the PO file
 * @typedef {{
 * key?: string,
 * type?: number,
 * value: string,
 * quote?: string,
 * obsolete?: boolean,
 * comments?: import('./types.js').GetTextComment | undefined
 * }} Node PO node
 */

/**
 * Parses a PO object into translation table
 *
 * @param {string | Buffer} input PO object
 * @param {Options} [options] Optional options with defaultCharset and validation
 */
export function poParse (input, options = {}) {
  const parser = new Parser(input, options);

  return parser.parse();
}

/**
 * Parses a PO stream, emits translation table in object mode
 *
 * @param {Options} [options] Optional options with defaultCharset and validation
 * @param {import('readable-stream').TransformOptions} [transformOptions] Optional stream options
 */
export function poStream (options = {}, transformOptions = {}) {
  return new PoParserTransform(options, transformOptions);
}

/**
 * Creates a PO parser object.
 * If a PO object is a string, UTF-8 will be used as the charset
 *
 * @param {string | Buffer} fileContents PO object
 * @param {Options} options Options with defaultCharset and validation
 */
function Parser (fileContents, { defaultCharset = 'iso-8859-1', validation = false }) {
  this._validation = validation;
  this._charset = defaultCharset;

  /** @type {Node[]} Lexed tokens */
  this._lex = [];
  this._escaped = false;
  /** @type {Node} */
  this._node = {};
  this._state = this.states.none;
  this._lineNumber = 1;

  if (typeof fileContents === 'string') {
    this._charset = 'utf-8';
    this._fileContents = fileContents;
  } else {
    this._fileContents = this._handleCharset(fileContents);
  }
}

/**
 * Parses the PO object and returns translation table
 *
 * @return {Object} Translation table
 */
Parser.prototype.parse = function () {
  this._lexer(this._fileContents);

  return this._finalize(this._lex);
};

/**
 * Detects charset for PO strings from the header
 *
 * @param {string | Buffer} buf Header value
 */
Parser.prototype._handleCharset = function (buf = '') {
  /** @type {string} */
  const str = buf.toString();
  let pos;
  let headers = '';
  let match;

  if ((pos = str.search(/^\s*msgid/im)) >= 0) {
    pos = pos + str.substring(pos + 5).search(/^\s*(msgid|msgctxt)/im);
    headers = str.substring(0, pos >= 0 ? pos + 5 : str.length);
  }

  if ((match = headers.match(/[; ]charset\s*=\s*([\w-]+)(?:[\s;]|\\n)*"\s*$/mi))) {
    this._charset = formatCharset(match[1], this._charset);
  }

  if (this._charset === 'utf-8') {
    return str;
  }

  return this._toString(buf);
};

/**
 * Converts buffer to string
 * @param {string | Buffer} buf Buffer to convert
 * @return {string} Converted string
 */
Parser.prototype._toString = function (buf) {
  return encoding.convert(buf, 'utf-8', this._charset).toString('utf-8');
};

/**
 * State constants for parsing FSM
 */
Parser.prototype.states = {
  none: 0x01,
  comments: 0x02,
  key: 0x03,
  string: 0x04,
  obsolete: 0x05
};

/**
 * Value types for lexer
 */
Parser.prototype.types = {
  comments: 0x01,
  key: 0x02,
  string: 0x03,
  obsolete: 0x04
};

/**
 * String matches for lexer
 */
Parser.prototype.symbols = {
  whitespace: /\s/,
  key: /[\w\-[\]]/,
  keyNames: /^(?:msgctxt|msgid(?:_plural)?|msgstr(?:\[\d+])?)$/
};
/**
 * Token parser. Parsed state can be found from this._lex
 *
 * @param {String} chunk String
 * @throws {ParserError} Throws a SyntaxError if the value doesn't match the key names.
 */
Parser.prototype._lexer = function (chunk) {
  let chr;

  for (let i = 0, len = chunk.length; i < len; i++) {
    chr = chunk.charAt(i);

    if (chr === '\n') {
      this._lineNumber += 1;
    }

    switch (this._state) {
      case this.states.none:
      case this.states.obsolete:
        if (chr === '"' || chr === "'") {
          this._node = {
            type: this.types.string,
            value: '',
            quote: chr
          };
          this._lex.push(this._node);
          this._state = this.states.string;
        } else if (chr === '#') {
          this._node = {
            type: this.types.comments,
            value: ''
          };
          this._lex.push(this._node);
          this._state = this.states.comments;
        } else if (!chr.match(this.symbols.whitespace)) {
          this._node = {
            type: this.types.key,
            value: chr
          };
          if (this._state === this.states.obsolete) {
            this._node.obsolete = true;
          }
          this._lex.push(this._node);
          this._state = this.states.key;
        }
        break;
      case this.states.comments:
        if (chr === '\n') {
          this._state = this.states.none;
        } else if (chr === '~' && this._node.value === '') {
          this._node.value += chr;
          this._state = this.states.obsolete;
        } else if (chr !== '\r') {
          this._node.value += chr;
        }
        break;
      case this.states.string:
        if (this._escaped) {
          switch (chr) {
            case 't':
              this._node.value += '\t';
              break;
            case 'n':
              this._node.value += '\n';
              break;
            case 'r':
              this._node.value += '\r';
              break;
            default:
              this._node.value += chr;
          }
          this._escaped = false;
        } else {
          if (chr === this._node.quote) {
            this._state = this.states.none;
          } else if (chr === '\\') {
            this._escaped = true;
            break;
          } else {
            this._node.value += chr;
          }
          this._escaped = false;
        }
        break;
      case this.states.key:
        if (!chr.match(this.symbols.key)) {
          if (!this._node.value.match(this.symbols.keyNames)) {
            /**  @type {Record<string, { lineNumber: number, message: SyntaxError}>} */
            throw new ParserError(`Error parsing PO data: Invalid key name "${this._node.value}" at line ${this._lineNumber}. This can be caused by an unescaped quote character in a msgid or msgstr value.`, this._lineNumber);
          }
          this._state = this.states.none;
          i--;
        } else {
          this._node.value += chr;
        }
        break;
    }
  }
};

/**
 * Join multi line strings
 *
 * @param {Node[]} tokens Parsed tokens
 * @return {Node[]} Parsed tokens, with multi line strings joined into one
 */
Parser.prototype._joinStringValues = function (tokens) {
  /** @type {Node[]}  */
  const response = [];
  let lastNode;

  for (let i = 0, len = tokens.length; i < len; i++) {
    if (lastNode && tokens[i].type === this.types.string && lastNode.type === this.types.string) {
      lastNode.value += tokens[i].value ?? '';
    } else if (lastNode && tokens[i].type === this.types.comments && lastNode.type === this.types.comments) {
      lastNode.value += '\n' + tokens[i].value;
    } else {
      response.push(tokens[i]);
      lastNode = tokens[i];
    }
  }

  return response;
};

/**
 * Parse comments into separate comment blocks
 *
 * @param {Node[]} tokens Parsed tokens
 */
Parser.prototype._parseComments = function (tokens) {
  for (const node of tokens) {
    if (!node || node.type !== this.types.comments) {
      continue;
    }

    /** @type {{
     [key: string]: string[];
     }} */
    const comment = {
      translator: [],
      extracted: [],
      reference: [],
      flag: [],
      previous: []
    };

    /** @type {string[]}  */
    const lines = (node.value || '').split(/\n/);

    for (const line of lines) {
      switch (line.charAt(0) || '') {
        case ':':
          comment.reference.push(line.substring(1).trim());
          break;
        case '.':
          comment.extracted.push(line.substring(1).replace(/^\s+/, ''));
          break;
        case ',':
          comment.flag.push(line.substring(1).replace(/^\s+/, ''));
          break;
        case '|':
          comment.previous.push(line.substring(1).replace(/^\s+/, ''));
          break;
        case '~':
          break;
        default:
          comment.translator.push(line.replace(/^\s+/, ''));
      }
    }

    node.value = {};

    for (const key of Object.keys(comment)) {
      if (key && comment[key]?.length) {
        node.value[key] = comment[key].join('\n');
      }
    }
  }
};

/**
 * Join gettext keys with values
 *
 * @param {Node[]& {key: { value: string } } } tokens - Parsed tokens containing key-value pairs
 * @return {Node[]} - An array of Nodes representing joined tokens
 */
Parser.prototype._handleKeys = function (tokens) {
  /** @type {Node[]} */
  const response = [];
  /** @type {Node & {key: any, obsolete?: boolean, comments?: string}} */
  let lastNode = {};

  for (let i = 0, len = tokens.length; i < len; i++) {
    if (tokens[i].type === this.types.key) {
      lastNode = {
        key: tokens[i].value
      };
      if (tokens[i].obsolete) {
        lastNode.obsolete = true;
      }
      if (i && tokens[i - 1].type === this.types.comments) {
        lastNode.comments = tokens[i - 1].value;
      }
      lastNode.value = '';
      /** @type {Node} */
      response.push(lastNode);
    } else if (tokens[i].type === this.types.string && lastNode) {
      lastNode.value += tokens[i].value;
    }
  }

  return response;
};

/**
 * Separate different values into individual translation objects
 *
 * @param {Node[]} tokens Parsed tokens
 * @return {import("./types.js").GetTextTranslation[]} Tokens
 */
Parser.prototype._handleValues = function (tokens) {
  const response = [];
  /** @type {import("./types.js").GetTextTranslation | {msgid_plural?: string, msgctxt?: string, msgstr?: string[], msgid: string, comments?: import("./types.js").GetTextComment, obsolete?: boolean}} Translation object */
  let lastNode = {};
  /** @type {string | undefined} */
  let curContext;
  /** @type {import('./types.js').GetTextComment | undefined} */
  let curComments;

  for (let i = 0, len = tokens.length; i < len; i++) {
    const tokenKey = tokens[i].key;
    if (!tokenKey) continue;
    if (tokenKey.toLowerCase() === 'msgctxt') {
      curContext = tokens[i].value;
      curComments = tokens[i].comments;
    } else if (tokenKey.toLowerCase() === 'msgid') {
      lastNode = {
        msgid: tokens[i].value,
        msgstr: []
      };
      if (tokens[i].obsolete) {
        lastNode.obsolete = true;
      }

      if (curContext) {
        lastNode.msgctxt = curContext;
      }

      if (curComments) {
        lastNode.comments = curComments;
      }

      if (tokens[i].comments && !lastNode.comments) {
        lastNode.comments = tokens[i].comments;
      }

      curContext = undefined;
      curComments = undefined;
      response.push(lastNode);
    } else if (tokenKey.toLowerCase() === 'msgid_plural') {
      if (lastNode) {
        if (this._validation && 'msgid_plural' in lastNode) {
          throw new SyntaxError(`Multiple msgid_plural error: entry "${lastNode.msgid}" in "${lastNode.msgctxt || ''}" context has multiple msgid_plural declarations.`);
        }

        lastNode.msgid_plural = tokens[i].value;
      }

      if (tokens[i].comments && !lastNode.comments) {
        lastNode.comments = tokens[i].comments;
      }

      curContext = undefined;
      curComments = undefined;
    } else if (tokenKey.substring(0, 6).toLowerCase() === 'msgstr') {
      if (lastNode) {
        const strData = lastNode.msgstr || [];
        const tokenValue = tokens[i].value;
        lastNode.msgstr = (strData).concat(tokenValue);
      }

      if (tokens[i].comments && !lastNode.comments) {
        lastNode.comments = tokens[i].comments;
      }

      curContext = undefined;
      curComments = undefined;
    }
  }

  return response;
};

/**
 * Validate token
 *
 * @param {{ msgid?: string, msgid_plural?: string, msgstr?: string[] }} token Parsed token
 * @param {import("./types.js").GetTextTranslations['translations']} translations Translation table
 * @param {string} msgctxt Message entry context
 * @param {number} nplurals Number of expected plural forms
 * @throws {Error} Will throw an error if token validation fails
 */
Parser.prototype._validateToken = function (
  {
    msgid = '',
    msgid_plural = '', // eslint-disable-line camelcase
    msgstr = []
  },
  translations,
  msgctxt,
  nplurals
) {
  if (msgid in translations[msgctxt]) {
    throw new SyntaxError(`Duplicate msgid error: entry "${msgid}" in "${msgctxt}" context has already been declared.`);
    // eslint-disable-next-line camelcase
  } else if (msgid_plural && msgstr.length !== nplurals) {
    // eslint-disable-next-line camelcase
    throw new RangeError(`Plural forms range error: Expected to find ${nplurals} forms but got ${msgstr.length} for entry "${msgid_plural}" in "${msgctxt}" context.`);
    // eslint-disable-next-line camelcase
  } else if (!msgid_plural && msgstr.length !== 1) {
    throw new RangeError(`Translation string range error: Extected 1 msgstr definitions associated with "${msgid}" in "${msgctxt}" context, found ${msgstr.length}.`);
  }
};

/**
 * Compose a translation table from tokens object
 *
 * @param {import("./types.js").GetTextTranslation[] & Node[]} tokens Parsed tokens
 * @return {import("./types.js").GetTextTranslations} Translation table
 */
Parser.prototype._normalize = function (tokens) {
  /**
   * Translation table to be returned
   * @type {{
   *    charset: string,
   *    obsolete?: { [x: string]: { [x: string]: import("./types.js").GetTextTranslation} },
   *    headers: import("./types.js").GetTextTranslations['headers'] | undefined,
   *    translations: import("./types.js").GetTextTranslations['translations'] | {}
   * }} table
   */
  const table = {
    charset: this._charset,
    headers: undefined,
    translations: {}
  };
  let nplurals = 1;

  for (let i = 0, len = tokens.length; i < len; i++) {
    /** @type {string} */
    const msgctxt = tokens[i].msgctxt || '';

    if (tokens[i].obsolete) {
      if (!table.obsolete) {
        table.obsolete = {};
      }

      if (!table.obsolete[msgctxt]) {
        table.obsolete[msgctxt] = {};
      }

      delete tokens[i].obsolete;

      table.obsolete[msgctxt][tokens[i].msgid] = tokens[i];

      continue;
    }

    if (!table.translations[msgctxt]) {
      table.translations[msgctxt] = {};
    }

    if (!table.headers && !msgctxt && !tokens[i].msgid) {
      table.headers = parseHeader(tokens[i].msgstr[0]);
      nplurals = parseNPluralFromHeadersSafely(table.headers, nplurals);
    }

    if (this._validation) {
      this._validateToken(tokens[i], table.translations, msgctxt, nplurals);
    }

    /** @type {import("./types.js").GetTextTranslation} token */
    const token = tokens[i];
    table.translations[msgctxt][token.msgid] = token;
  }

  return table;
};

/**
 * Converts parsed tokens to a translation table
 *
 * @param {Node[]} tokens Parsed tokens
 * @returns {import("./types.js").GetTextTranslations} Translation table
 */
Parser.prototype._finalize = function (tokens) {
  /**
   * Translation table
   * @type {Node[]} Translation table
   */
  let data = this._joinStringValues(tokens);

  this._parseComments(data);

  // The PO parser gettext keys with values
  data = this._handleKeys(data);

  // The PO parser individual translation objects
  const dataset = this._handleValues(data);
  return this._normalize(dataset);
};

/**
 * @typedef {import('stream').Stream.Writable} WritableState
 */
/**
   * Creates a transform stream for parsing PO input
   * @constructor
   * @this {PoParserTransform & Transform}
   *
   * @param {import( "./types.js").parserOptions} options Optional options with defaultCharset and validation
   * @param {import('readable-stream').TransformOptions & {initialTreshold?: number;}} transformOptions Optional stream options
   */
function PoParserTransform (options, transformOptions) {
  this.options = options;
  /** @type {Parser|false} */
  this._parser = false;
  this._tokens = {};

  /** @type {*[]} */
  this._cache = [];
  this._cacheSize = 0;

  this.initialTreshold = transformOptions.initialTreshold || 2 * 1024;

  Transform.call(this, transformOptions);

  this._writableState.objectMode = false;
  this._readableState.objectMode = true;
}
util.inherits(PoParserTransform, Transform);

/**
   * Processes a chunk of the input stream
   * @param {Buffer} chunk Chunk of the input stream
   * @param {string} encoding Encoding of the chunk
   * @param {(k?: *)=> void} done Callback to call when the chunk is processed
   */
PoParserTransform.prototype._transform = function (chunk, encoding, done) {
  let i;
  let len = 0;

  if (!chunk || !chunk.length) {
    return done();
  }

  if (!this._parser) {
    this._cache.push(chunk);
    this._cacheSize += chunk.length;

    // wait until the first 1kb before parsing headers for charset
    if (this._cacheSize < this.initialTreshold) {
      return setImmediate(done);
    } else if (this._cacheSize) {
      chunk = Buffer.concat(this._cache, this._cacheSize);
      this._cacheSize = 0;
      this._cache = [];
    }

    this._parser = new Parser(chunk, this.options);
  } else if (this._cacheSize) {
    // this only happens if we had an uncompleted 8bit sequence from the last iteration
    this._cache.push(chunk);
    this._cacheSize += chunk.length;
    chunk = Buffer.concat(this._cache, this._cacheSize);
    this._cacheSize = 0;
    this._cache = [];
  }

  // cache 8bit bytes from the end of the chunk
  // helps if the chunk ends in the middle of an utf-8 sequence
  for (i = chunk.length - 1; i >= 0; i--) {
    if (chunk[i] >= 0x80) {
      len++;
      continue;
    }
    break;
  }
  // it seems we found some 8bit bytes from the end of the string, so let's cache these
  if (len) {
    this._cache = [chunk.subarray(chunk.length - len)];
    this._cacheSize = this._cache[0].length;
    chunk = chunk.subarray(0, chunk.length - len);
  }

  // chunk might be empty if it only continued of 8bit bytes and these were all cached
  if (chunk.length) {
    try {
      this._parser._lexer(this._parser._toString(chunk));
    } catch (/** @type {any} error */error) {
      setImmediate(() => {
        done(error);
      });

      return;
    }
  }

  setImmediate(done);
};

/**
   * Once all inputs have been processed, emit the parsed translation table as an object
   * @param {} done Callback to call when the chunk is processed
   */
PoParserTransform.prototype._flush = function (done) {
  let chunk;

  if (this._cacheSize) {
    chunk = Buffer.concat(this._cache, this._cacheSize);
  }

  if (!this._parser && chunk) {
    this._parser = new Parser(chunk, this.options);
  }

  if (chunk && this._parser) {
    try {
      this._parser._lexer(this._parser._toString(chunk));
    } catch (error) {
      setImmediate(() => {
        done(error);
      });

      return;
    }
  }

  if (this._parser) {
    this.push(this._parser._finalize(this._parser._lex));
  }

  setImmediate(done);
};
