gettext-parser [![ci](https://github.com/smhg/gettext-parser/actions/workflows/ci.yml/badge.svg)](https://github.com/smhg/gettext-parser/actions/workflows/ci.yml)
==============

Parse and compile gettext *po* and *mo* files with node.js, nothing more, nothing less.

> *Please note:* starting with version 3 only latest LTS and latest stable node versions are supported. **Use version 2 with older node versions.**

## Usage

Include the library:

    var gettextParser = require("gettext-parser");


### Parse PO files

Parse a PO file with

    gettextParser.po.parse(input[, defaultCharset]) → Object

Where

  * **input** is a *po* file as a Buffer or an unicode string. Charset is converted to unicode from other encodings only if the input is a Buffer, otherwise the charset information is discarded
  * **defaultCharset** is the charset to use if charset is not defined or is the default `"CHARSET"` (applies only if *input* is a Buffer)

Method returns gettext-parser specific translation object (see below)

**Example**

```javascript
var input = require('fs').readFileSync('en.po');
var po = gettextParser.po.parse(input);
console.log(po.translations['']); // output translations for the default context
```

### Parse PO as a Stream

PO files can also be parsed from a stream source. After all input is processed the parser emits a single 'data' event which contains the parsed translation object.

    gettextParser.po.createParseStream([defaultCharset][, streamOptions]) → Transform Stream

Where

  * **defaultCharset** is the charset to use if charset is not defined or is the default `"CHARSET"`
  * **streamOptions** are the standard stream options

**Example**

```javascript
var input = require('fs').createReadStream('en.po');
var po = gettextParser.po.createParseStream();
input.pipe(po);
po.on('data', function(data){
    console.log(data.translations['']); // output translations for the default context
});
```

### Compile PO from a translation object

If you have a translation object you can convert this to a valid PO file with

    gettextParser.po.compile(data[, options]) → Buffer

Where

  * **data** is a translation object either got from parsing a PO/MO file or composed by other means
  * **options** is a configuration object with possible values
    * **foldLength** is the length at which to fold message strings into newlines (default: 76). Set to 0 or false to disable folding.
    * **sort** (boolean|Function) - (default `false`) if `true`, entries will be sorted by msgid in the resulting .po(.pot) file.
      If a comparator function is provided, that function will be used to sort entries in the output. The function is called with two arguments, each of which is a single message entry with the structure described below. The function should follow the standard rules for functions passed to `Array.sort()`: return `0` if the entries are interchangeable in sort order; return a number less than 0 if the first entry should come before the second one; and return a number greater than 0 if the second entry should come before the first one.
    * **escapeCharacters** (boolean) - (default `true`) if `false`, will skip escape newlines and quotes characters functionality.

**Example**

```javascript
var data = {
    ...
};
var output = gettextParser.po.compile(data);
require('fs').writeFileSync('filename.po', output);
```

### Parse MO files

Parse a MO file with

    gettextParser.mo.parse(input[, defaultCharset]) → Object

Where

  * **input** is a *mo* file as a Buffer
  * **defaultCharset** is the charset to use if charset is not defined or is the default `"CHARSET"`

Method returns gettext-parser specific translation object (see below)

**Example**

```javascript
var input = require('fs').readFileSync('en.mo');
var mo = gettextParser.mo.parse(input);
console.log(mo.translations['']); // output translations for the default context
```

### Compile MO from a translation object

If you have a translation object you can convert this to a valid MO file with

    gettextParser.mo.compile(data) → Buffer

Where

  * **data** is a translation object either got from parsing a PO/MO file or composed by other means

**Example**

```javascript
var data = {
    ...
};
var output = gettextParser.mo.compile(data);
require('fs').writeFileSync('filename.mo', output);
```

### Notes

#### Overriding charset

If you are compiling a previously parsed translation object, you can override the output charset with the `charset` property (applies both for compiling *mo* and *po* files).

```javascript
var obj = gettextParser.po.parse(inputBuf);
obj.charset = "windows-1257";
outputBuf = gettextParser.po.compile(obj);
```

Headers for the output are modified to match the updated charset.

#### ICONV support

By default *gettext-parser* uses pure JS [iconv-lite](https://github.com/ashtuchkin/iconv-lite) for encoding and decoding non UTF-8 charsets. If you need to support more complex encodings that are not supported by *iconv-lite*, you need to add [iconv](https://github.com/bnoordhuis/node-iconv) as an additional dependency for your project (*gettext-parser* will detect if it is available and tries to use it instead of *iconv-lite*).

## Data structure of parsed mo/po files

### Character set

Parsed data is always in unicode but the original charset of the file can
be found from the `charset` property. This value is also used when compiling translations
to a *mo* or *po* file.

### Headers

Headers can be found from the `headers` object, all keys are lowercase and the value for a key is a string. This value will also be used when compiling.

### Translations

Translations can be found from the `translations` object which in turn holds context objects for `msgctxt`. Default context can be found from `translations[""]`.

Context objects include all the translations, where `msgid` value is the key. The value is an object with the following possible properties:

  * **msgctxt** context for this translation, if not present the default context applies
  * **msgid** string to be translated
  * **msgid_plural** the plural form of the original string (might not be present)
  * **msgstr** an array of translations
  * **comments** an object with the following properties: `translator`, `reference`, `extracted`, `flag`, `previous`.

Example

```json
{
  "charset": "iso-8859-1",

  "headers": {
    "content-type": "text/plain; charset=iso-8859-1",
    "plural-forms": "nplurals=2; plural=(n!=1);"
  },

  "translations": {
    "": {
      "": {
        "msgid": "",
        "msgstr": ["Content-Type: text/plain; charset=iso-8859-1\n..."]
      }
    },
    "another context": {
      "%s example": {
        "msgctxt": "another context",
        "msgid": "%s example",
        "msgid_plural": "%s examples",
        "msgstr": ["% näide", "%s näidet"],
        "comments": {
          "translator": "This is regular comment",
          "reference": "/path/to/file:123"
        }
      }
    }
  }
}
```

Notice that the structure has both a `headers` object and a `""` translation with the header string. When compiling the structure to a *mo* or a *po* file, the `headers` object is used to define the header. Header string in the `""` translation is just for reference (includes the original unmodified data) but will not be used when compiling. So if you need to add or alter header values, use only the `headers` object.

If you need to convert *gettext-parser* formatted translation object to something else, eg. for *jed*, check out [po2json](https://github.com/mikeedwards/po2json).

## License

**MIT**
