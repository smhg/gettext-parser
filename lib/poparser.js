var encoding = require("encoding"),
    sharedFuncs = require("./shared");

/**
 * Parses a PO object into translation table
 *
 * @param {Buffer|String} buffer PO object
 * @param {String} [defaultCharset] Default charset to use
 * @return {Object} Translation object
 */
module.exports = function(buffer, defaultCharset){
    var parser = new Parser(buffer, defaultCharset);
    return parser.parse();
};

/**
 * Creates a PO parser object. If PO object is a string, 
 * UTF-8 will be used as the charset
 *
 * @constructor
 * @param {Buffer|String} fileContents PO object
 * @param {String} [defaultCharset] Default charset to use
 */
function Parser(fileContents, defaultCharset){
    
    this._charset = defaultCharset || "iso-8859-1";

    if(typeof fileContents == "string"){
        this._charset = "utf-8";
        this._fileContents = fileContents;
    }else{
        this._handleCharset(fileContents);
    }

}

/**
 * Detects charset for PO strings from the header
 * 
 * @param {Buffer} headers Header value
 */
Parser.prototype._handleCharset = function(buf){
    var str = (buf || "").toString(),
        pos, headers = "", match;
    
    if((pos = str.search(/^\s*msgid/im))>=0){
        if((pos = pos + str.substr(pos + 5).search(/^\s*(msgid|msgctxt)/im))){
            headers = str.substr(0, pos);
        }
    }
    
    if((match = headers.match(/[; ]charset\s*=\s*([\w\-]+)(?:[\s;]|\\n)*"\s*$/mi))){
        this._charset = sharedFuncs.formatCharset(match[1], this._charset);
    }

    if(this._charset == "utf-8"){
        this._fileContents = str;
    }else{
        this._fileContents = encoding.convert(buf, "utf-8", this._charset).toString("utf-8");
    }
};

/**
 * State constants for parsing FSM
 */
Parser.prototype.states = {
    none: 0x01,
    comments: 0x02,
    key: 0x03,
    string: 0x04
};

/**
 * Value types for lexer
 */
Parser.prototype.types = {
    comments: 0x01,
    key: 0x02,
    string: 0x03
};

/**
 * String matches for lexer
 */
Parser.prototype.symbols = {
    quotes: /['"]/,
    comments: /\#/,
    whitespace: /\s/,
    key: /[\w\-\[\]]/
};

/**
 * Token parser
 *
 * @return {Object} Parsed tokens
 */
Parser.prototype._lexer = function(){
    var chr,
        escaped = false,
        lex = [],
        node,
        state = this.states.none;
    
    for(var i=0, len = this._fileContents.length; i<len; i++){
        chr = this._fileContents.charAt(i);
        switch(state){
            case this.states.none:
                if(chr.match(this.symbols.quotes)){
                    node = {
                        type: this.types.string,
                        value: "",
                        quote: chr
                    };
                    lex.push(node);
                    state = this.states.string;
                }else if(chr.match(this.symbols.comments)){
                    node = {
                        type: this.types.comments,
                        value: ""
                    };
                    lex.push(node);
                    state = this.states.comments;
                }else if(!chr.match(this.symbols.whitespace)){
                    node = {
                        type: this.types.key,
                        value: chr
                    };
                    lex.push(node);
                    state = this.states.key;
                }
                break;
            case this.states.comments:
                if(chr == "\n"){
                    state = this.states.none;
                }else if(chr != "\r"){
                    node.value += chr;
                }
                break;
            case this.states.string:
                if(escaped){
                    switch(chr){
                        case "t": node.value += "\t"; break;
                        case "n": node.value += "\n"; break;
                        case "r": node.value += "\r"; break;
                        default:
                            node.value += chr;
                    }
                    escaped = false;
                }else{
                    if(chr == node.quote){
                        state = this.states.none;
                    }else if(chr == "\\"){
                        escaped = true;
                        break;
                    }else{
                        node.value += chr;
                    }
                    escaped = false;
                }
                break;
            case this.states.key:
                if(!chr.match(this.symbols.key)){
                    state = this.states.none;
                    i--;
                }else{
                    node.value += chr;
                }
                break;
        }
    }
        
    return lex;
};

/**
 * Join multi line strings
 *
 * @param {Object} lex Parsed tokens
 * @return {Object} Parsed tokens, with multi line strings joined into one
 */
Parser.prototype._joinStringValues = function(lex){
    var lastNode, response = [];

    for(var i=0, len = lex.length; i<len; i++){
        if(lastNode && lex[i].type == this.types.string && lastNode.type == this.types.string){
            lastNode.value += lex[i].value;
        }else if(lastNode && lex[i].type == this.types.comments && lastNode.type == this.types.comments){
            lastNode.value += "\n" + lex[i].value;
        }else{
            response.push(lex[i]);
            lastNode = lex[i];
        }
    }

    return response;
};

/**
 * Parse comments into separate comment blocks
 *
 * @param {Object} lex Parsed tokens
 */
Parser.prototype._parseComments = function(lex){
    // parse comments
    lex.forEach((function(node){
        var comment, lines;

        if(node && node.type == this.types.comments){
            comment = {translator: [], extracted: [], reference: [], flag: [], previous: []};
            lines = (node.value || "").split(/\n/);
            lines.forEach(function(line){
                switch(line.charAt(0) || ""){
                    case ":": 
                        comment.reference.push(line.substr(1).trim());
                        break;
                    case ".": 
                        comment.extracted.push(line.substr(1).replace(/^\s+/, ""));
                        break;
                    case ",": 
                        comment.flag.push(line.substr(1).replace(/^\s+/, ""));
                        break;
                    case "|": 
                        comment.previous.push(line.substr(1).replace(/^\s+/, ""));
                        break;
                    default: 
                        comment.translator.push(line.replace(/^\s+/, ""));
                }
            });

            node.value = {};

            Object.keys(comment).forEach(function(key){
                if(comment[key] && comment[key].length){
                    node.value[key] = comment[key].join("\n");
                }
            });
        }
    }).bind(this));
};

/**
 * Join gettext keys with values
 *
 * @param {Object} lex Parsed tokens
 * @return {Object} Tokens
 */
Parser.prototype._handleKeys = function(lex){
    var response = [], lastNode;

    for(var i=0, len = lex.length; i<len; i++){
        if(lex[i].type == this.types.key){
            lastNode = {
                key: lex[i].value
            };
            if(i && lex[i-1].type == this.types.comments){
                lastNode.comments = lex[i-1].value;
            }
            lastNode.value = "";
            response.push(lastNode);
        }else if(lex[i].type == this.types.string && lastNode){
            lastNode.value += lex[i].value;
        }
    }

    return response;
};

/**
 * Separate different values into individual translation objects
 *
 * @param {Object} lex Parsed tokens
 * @return {Object} Tokens
 */
Parser.prototype._handleValues = function(lex){
    var response = [], lastNode, curContext, curComments;

    for(var i=0, len = lex.length; i<len; i++){
        if(lex[i].key.toLowerCase() == "msgctxt"){
            curContext = lex[i].value;
            curComments = lex[i].comments;
        }else if(lex[i].key.toLowerCase() == "msgid"){
            lastNode = {
                msgid: lex[i].value
            };
            
            if(curContext){
                lastNode.msgctxt = curContext;
            }
            
            if(curComments){
                lastNode.comments = curComments;
            }
            
            if(lex[i].comments && !lastNode.comments){
                lastNode.comments = lex[i].comments;
            }
            
            curContext = false;
            curComments = false;
            response.push(lastNode);
        }else if(lex[i].key.toLowerCase() == "msgid_plural"){
            if(lastNode){
                lastNode.msgid_plural = lex[i].value;
            }
            
            if(lex[i].comments && !lastNode.comments){
                lastNode.comments = lex[i].comments;
            }
            
            curContext = false;
            curComments = false;
        }else if(lex[i].key.substr(0, 6).toLowerCase() == "msgstr"){
            if(lastNode){
                lastNode.msgstr = (lastNode.msgstr || []).concat(lex[i].value);
            }
            
            if(lex[i].comments && !lastNode.comments){
                lastNode.comments = lex[i].comments;
            }
            
            curContext = false;
            curComments = false;
        }
    }

    return response;
};

/**
 * Compose a translation table from tokens object
 *
 * @param {Object} lex Parsed tokens
 * @return {Object} Translation table
 */
Parser.prototype._normalize = function(lex){
    var msgctxt,
        table = {
            charset: this._charset,
            headers: undefined, 
            translations: {}
        };

    for(var i=0, len = lex.length; i < len; i++){
        msgctxt = lex[i].msgctxt || "";

        if(!table.translations[msgctxt]){
            table.translations[msgctxt] = {};
        }

        if(!table.headers && !msgctxt && !lex[i].msgid){
            table.headers = sharedFuncs.parseHeader(lex[i].msgstr[0]);
        }

        table.translations[msgctxt][lex[i].msgid] = lex[i];
    }

    return table;
};

/**
 * Parses the PO object and returns translation table
 *
 * @return {Object} Translation table
 */
Parser.prototype.parse = function(){
    var lex = this._lexer();
    
    lex = this._joinStringValues(lex);
    this._parseComments(lex);
    lex = this._handleKeys(lex);
    lex = this._handleValues(lex);

    return this._normalize(lex);
};
