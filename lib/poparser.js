const { convert } = require('encoding');
const {
  parseHeader,
  formatCharset
} = require('./shared');
const { Transform } = require('readable-stream');

class Parser {
  /**
   * Creates a PO parser object. If PO object is a string,
   * UTF-8 will be used as the charset
   *
   * @constructor
   * @param {Buffer|String} fileContents PO object
   * @param {String} [defaultCharset] Default charset to use
   */
  constructor (fileContents, defaultCharset = 'iso-8859-1') {
    this._charset = defaultCharset;

    this._lex = [];
    this._escaped = false;
    this._node = {};

    /**
     * State constants for parsing FSM
     */
    this.states = {
      none: 0x01,
      comments: 0x02,
      key: 0x03,
      string: 0x04,
      obsolete: 0x05
    };

    /**
     * Value types for lexer
     */
    this.types = {
      comments: 0x01,
      key: 0x02,
      string: 0x03,
      obsolete: 0x04
    };

    /**
     * String matches for lexer
     */
    this.symbols = {
      quotes: /["']/,
      comments: /#/,
      whitespace: /\s/,
      key: /[\w\-[\]]/,
      keyNames: /^(?:msgctxt|msgid(?:_plural)?|msgstr(?:\[\d+])?)$/
    };

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
  parse () {
    this._lexer(this._fileContents);

    return this._finalize(this._lex);
  }

  /**
   * Detects charset for PO strings from the header
   *
   * @param {Buffer} buf Header value
   */
  _handleCharset (buf = '') {
    const str = buf.toString();
    let pos;
    let headers = '';
    let match;

    if ((pos = str.search(/^\s*msgid/im)) >= 0) {
      pos = pos + str.substr(pos + 5).search(/^\s*(msgid|msgctxt)/im);
      headers = str.substr(0, pos >= 0 ? pos + 5 : str.length);
    }

    if ((match = headers.match(/[; ]charset\s*=\s*([\w-]+)(?:[\s;]|\\n)*"\s*$/mi))) {
      this._charset = formatCharset(match[1], this._charset);
    }

    if (this._charset === 'utf-8') {
      return str;
    }

    return this._toString(buf);
  }

  _toString (buf) {
    return convert(buf, 'utf-8', this._charset).toString('utf-8');
  }

  /**
   * Token parser. Parsed state can be found from this._lex
   *
   * @param {String} chunk String
   */
  _lexer (chunk) {
    let chr;

    for (let i = 0, len = chunk.length; i < len; i++) {
      chr = chunk.charAt(i);

      if (chr === '\n') {
        this._lineNumber += 1;
      }

      switch (this._state) {
        case this.states.none:
        case this.states.obsolete:
          if (chr.match(this.symbols.quotes)) {
            this._node = {
              type: this.types.string,
              value: '',
              quote: chr
            };
            this._lex.push(this._node);
            this._state = this.states.string;
          } else if (chr.match(this.symbols.comments)) {
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
              const err = new SyntaxError(`Error parsing PO data: Invalid key name "${this._node.value}" at line ${this._lineNumber}. This can be caused by an unescaped quote character in a msgid or msgstr value.`);

              err.lineNumber = this._lineNumber;

              throw err;
            }
            this._state = this.states.none;
            i--;
          } else {
            this._node.value += chr;
          }
          break;
      }
    }
  }

  /**
   * Join multi line strings
   *
   * @param {Object} tokens Parsed tokens
   * @return {Object} Parsed tokens, with multi line strings joined into one
   */
  _joinStringValues (tokens) {
    const response = [];
    let lastNode;

    for (let i = 0, len = tokens.length; i < len; i++) {
      if (lastNode && tokens[i].type === this.types.string && lastNode.type === this.types.string) {
        lastNode.value += tokens[i].value;
      } else if (lastNode && tokens[i].type === this.types.comments && lastNode.type === this.types.comments) {
        lastNode.value += '\n' + tokens[i].value;
      } else {
        response.push(tokens[i]);
        lastNode = tokens[i];
      }
    }

    return response;
  }

  /**
   * Parse comments into separate comment blocks
   *
   * @param {Object} tokens Parsed tokens
   */
  _parseComments (tokens) {
    // parse comments
    tokens.forEach(node => {
      let comment;
      let lines;

      if (node && node.type === this.types.comments) {
        comment = {
          translator: [],
          extracted: [],
          reference: [],
          flag: [],
          previous: []
        };

        lines = (node.value || '').split(/\n/);

        lines.forEach(line => {
          switch (line.charAt(0) || '') {
            case ':':
              comment.reference.push(line.substr(1).trim());
              break;
            case '.':
              comment.extracted.push(line.substr(1).replace(/^\s+/, ''));
              break;
            case ',':
              comment.flag.push(line.substr(1).replace(/^\s+/, ''));
              break;
            case '|':
              comment.previous.push(line.substr(1).replace(/^\s+/, ''));
              break;
            case '~':
              break;
            default:
              comment.translator.push(line.replace(/^\s+/, ''));
          }
        });

        node.value = {};

        Object.keys(comment).forEach(key => {
          if (comment[key] && comment[key].length) {
            node.value[key] = comment[key].join('\n');
          }
        });
      }
    });
  }

  /**
   * Join gettext keys with values
   *
   * @param {Object} tokens Parsed tokens
   * @return {Object} Tokens
   */
  _handleKeys (tokens) {
    const response = [];
    let lastNode;

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
        response.push(lastNode);
      } else if (tokens[i].type === this.types.string && lastNode) {
        lastNode.value += tokens[i].value;
      }
    }

    return response;
  }

  /**
   * Separate different values into individual translation objects
   *
   * @param {Object} tokens Parsed tokens
   * @return {Object} Tokens
   */
  _handleValues (tokens) {
    const response = [];
    let lastNode;
    let curContext;
    let curComments;

    for (let i = 0, len = tokens.length; i < len; i++) {
      if (tokens[i].key.toLowerCase() === 'msgctxt') {
        curContext = tokens[i].value;
        curComments = tokens[i].comments;
      } else if (tokens[i].key.toLowerCase() === 'msgid') {
        lastNode = {
          msgid: tokens[i].value
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

        curContext = false;
        curComments = false;
        response.push(lastNode);
      } else if (tokens[i].key.toLowerCase() === 'msgid_plural') {
        if (lastNode) {
          lastNode.msgid_plural = tokens[i].value;
        }

        if (tokens[i].comments && !lastNode.comments) {
          lastNode.comments = tokens[i].comments;
        }

        curContext = false;
        curComments = false;
      } else if (tokens[i].key.substr(0, 6).toLowerCase() === 'msgstr') {
        if (lastNode) {
          lastNode.msgstr = (lastNode.msgstr || []).concat(tokens[i].value);
        }

        if (tokens[i].comments && !lastNode.comments) {
          lastNode.comments = tokens[i].comments;
        }

        curContext = false;
        curComments = false;
      }
    }

    return response;
  }

  /**
   * Compose a translation table from tokens object
   *
   * @param {Object} tokens Parsed tokens
   * @return {Object} Translation table
   */
  _normalize (tokens) {
    const table = {
      charset: this._charset,
      headers: undefined,
      translations: {}
    };
    let msgctxt;

    for (let i = 0, len = tokens.length; i < len; i++) {
      msgctxt = tokens[i].msgctxt || '';

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
      }

      table.translations[msgctxt][tokens[i].msgid] = tokens[i];
    }

    return table;
  }

  /**
   * Converts parsed tokens to a translation table
   *
   * @param {Object} tokens Parsed tokens
   * @returns {Object} Translation table
   */
  _finalize (tokens) {
    let data = this._joinStringValues(tokens);

    this._parseComments(data);

    data = this._handleKeys(data);
    data = this._handleValues(data);

    return this._normalize(data);
  }
}

class PoParserTransform extends Transform {
  /**
   * Creates a transform stream for parsing PO input
   *
   * @constructor
   * @param {String} [defaultCharset] Default charset to use
   * @param {String} [options] Stream options
   */
  constructor (defaultCharset, options) {
    if (!options && defaultCharset && typeof defaultCharset === 'object') {
      options = defaultCharset;
      defaultCharset = undefined;
    }

    super(options);

    this.defaultCharset = defaultCharset;
    this._parser = false;
    this._tokens = {};

    this._cache = [];
    this._cacheSize = 0;

    this.initialTreshold = options.initialTreshold || 2 * 1024;

    this._writableState.objectMode = false;
    this._readableState.objectMode = true;
  }

  /**
   * Processes a chunk of the input stream
   */
  _transform (chunk, encoding, done) {
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

      this._parser = new Parser(chunk, this.defaultCharset);
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
      this._cache = [chunk.slice(chunk.length - len)];
      this._cacheSize = this._cache[0].length;
      chunk = chunk.slice(0, chunk.length - len);
    }

    // chunk might be empty if it only continued of 8bit bytes and these were all cached
    if (chunk.length) {
      try {
        this._parser._lexer(this._parser._toString(chunk));
      } catch (error) {
        setImmediate(() => {
          done(error);
        });

        return;
      }
    }

    setImmediate(done);
  }

  /**
   * Once all input has been processed emit the parsed translation table as an object
   */
  _flush (done) {
    let chunk;

    if (this._cacheSize) {
      chunk = Buffer.concat(this._cache, this._cacheSize);
    }

    if (!this._parser && chunk) {
      this._parser = new Parser(chunk, this.defaultCharset);
    }

    if (chunk) {
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
  }
}

/**
 * Parses a PO object into translation table
 *
 * @param {Buffer|String} buffer PO object
 * @param {String} [defaultCharset] Default charset to use
 * @return {Object} Translation object
 */
function parse (buffer, defaultCharset) {
  const parser = new Parser(buffer, defaultCharset);

  return parser.parse();
}

/**
 * Parses a PO stream, emits translation table in object mode
 *
 * @param {String} [defaultCharset] Default charset to use
 * @param {String} [options] Stream options
 * @return {Stream} Transform stream
 */
function stream (defaultCharset, options) {
  return new PoParserTransform(defaultCharset, options);
}

module.exports = {
  parse,
  stream
};
