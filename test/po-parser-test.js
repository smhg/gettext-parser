import * as chai from 'chai';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import * as gettextParser from '../index.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readFile = promisify(fs.readFile);

const expect = chai.expect;
chai.config.includeStack = true;

describe('PO Parser', () => {
  describe('headers', () => {
    it('should detect charset in header', async () => {
      const [po, json] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/headers-charset.po')),
        readFile(path.join(__dirname, 'fixtures/headers-charset.json'), 'utf8')
      ]);

      const parsed = gettextParser.po.parse(po);

      expect(parsed).to.deep.equal(JSON.parse(json));
    });

    it('should parse all known headers', async () => {
      const [po, json] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/headers-known.po')),
        readFile(path.join(__dirname, 'fixtures/headers-known.json'), 'utf8')
      ]);

      const parsed = gettextParser.po.parse(po);

      expect(parsed).to.deep.equal(JSON.parse(json));
    });
  });

  describe('UTF-8', () => {
    it('should parse', async () => {
      const [po, json] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/utf8.po')),
        readFile(path.join(__dirname, 'fixtures/utf8-po.json'), 'utf8')
      ]);

      const parsed = gettextParser.po.parse(po);

      expect(parsed).to.deep.equal(JSON.parse(json));
    });
  });

  describe('UTF-8 as a string', () => {
    it('should parse', async () => {
      const [po, json] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/utf8.po'), 'utf8'),
        readFile(path.join(__dirname, 'fixtures/utf8-po.json'), 'utf8')
      ]);

      const parsed = gettextParser.po.parse(po);

      expect(parsed).to.deep.equal(JSON.parse(json));
    });
  });

  describe('Stream input', () => {
    it('should parse', done => {
      const po = fs.createReadStream(path.join(__dirname, 'fixtures/utf8.po'), {
        highWaterMark: 1 // ensure that any utf-8 sequences will be broken when streaming
      });

      const json = fs.readFileSync(path.join(__dirname, 'fixtures/utf8-po.json'), 'utf8');

      let parsed;

      const stream = po.pipe(gettextParser.po.createParseStream({
        initialTreshold: 800 // home many bytes to cache for parsing the header
      }));

      stream.on('data', data => {
        parsed = data;
      });

      stream.on('end', () => {
        expect(parsed).to.deep.equal(JSON.parse(json));
        done();
      });
    });
  });

  describe('Latin-13', () => {
    it('should parse', async () => {
      const [po, json] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/latin13.po')),
        readFile(path.join(__dirname, 'fixtures/latin13-po.json'), 'utf8')
      ]);

      const parsed = gettextParser.po.parse(po);

      expect(parsed).to.deep.equal(JSON.parse(json));
    });
  });

  describe('parsing errors', () => {
    const invalidKeyError = /Error parsing PO data: Invalid key name/;

    it('should throw (stream with unescaped quote)', done => {
      const poStream = fs.createReadStream(path.join(__dirname, 'fixtures/error-unescaped-quote.po'), {
        highWaterMark: 1 // ensure that any utf-8 sequences will be broken when streaming
      });

      const stream = poStream.pipe(gettextParser.po.createParseStream({
        initialTreshold: 800 // home many bytes to cache for parsing the header
      }));

      stream.on('error', error => {
        expect(error.message).to.match(invalidKeyError);
        done();
      });
    });

    describe('when validation is disabled', () => {
      const options = { validation: false };

      it('should throw (unescaped quote)', async () => {
        const po = await readFile(path.join(__dirname, 'fixtures/error-unescaped-quote.po'));

        expect(gettextParser.po.parse.bind(gettextParser.po, po, options)).to.throw(invalidKeyError);
      });

      it('should throw (double-escaped quote)', async () => {
        const po = await readFile(path.join(__dirname, 'fixtures/error-double-escaped-quote.po'));

        expect(gettextParser.po.parse.bind(gettextParser.po, po, options)).to.throw(invalidKeyError);
      });

      it('should not throw (an entry has too few plural forms)', async () => {
        const po = await readFile(path.join(__dirname, 'fixtures/validate-too-few-plural-forms.po'));

        expect(gettextParser.po.parse.bind(gettextParser.po, po, options)).to.not.throw();
      });

      it('should not throw (an entry has too many plural forms)', async () => {
        const po = await readFile(path.join(__dirname, 'fixtures/validate-too-many-plural-forms.po'));

        expect(gettextParser.po.parse.bind(gettextParser.po, po, options)).to.not.throw();
      });

      it('should not throw (an entry misses "msgid_plural")', async () => {
        const po = await readFile(path.join(__dirname, 'fixtures/validate-missing-msgid-plural.po'));

        expect(gettextParser.po.parse.bind(gettextParser.po, po, options)).to.not.throw();
      });

      it('should not throw (an entry misses single "msgstr")', async () => {
        const po = await readFile(path.join(__dirname, 'fixtures/validate-missing-msgstr.po'));

        expect(gettextParser.po.parse.bind(gettextParser.po, po, options)).to.not.throw();
      });

      it('should not throw (duplicate entries found in the same context)', async () => {
        const po = await readFile(path.join(__dirname, 'fixtures/validate-context-duplicate-entries.po'));

        expect(gettextParser.po.parse.bind(gettextParser.po, po, options)).to.not.throw();
      });

      it('should not throw (an entry with multiple "msgid_plural")', async () => {
        const po = await readFile(path.join(__dirname, 'fixtures/validate-redundant-msgid-plural.po'));

        expect(gettextParser.po.parse.bind(gettextParser.po, po, options)).to.not.throw();
      });
    });

    describe('when validation is enabled', () => {
      const options = { validation: true };

      it('should throw (unescaped quote)', async () => {
        const po = await readFile(path.join(__dirname, 'fixtures/error-unescaped-quote.po'));

        expect(gettextParser.po.parse.bind(gettextParser.po, po, options)).to.throw(invalidKeyError);
      });

      it('should throw (double-escaped quote)', async () => {
        const po = await readFile(path.join(__dirname, 'fixtures/error-double-escaped-quote.po'));

        expect(gettextParser.po.parse.bind(gettextParser.po, po, options)).to.throw(invalidKeyError);
      });

      it('should throw (an entry has too few plural forms)', async () => {
        const po = await readFile(path.join(__dirname, 'fixtures/validate-too-few-plural-forms.po'));

        expect(gettextParser.po.parse.bind(gettextParser.po, po, options)).to.throw('Plural forms range error: Expected to find 3 forms but got 2 for entry "o1-2" in "" context.');
      });

      it('should throw (an entry has too many plural forms)', async () => {
        const po = await readFile(path.join(__dirname, 'fixtures/validate-too-many-plural-forms.po'));

        expect(gettextParser.po.parse.bind(gettextParser.po, po, options)).to.throw('Plural forms range error: Expected to find 2 forms but got 3 for entry "o1-2" in "" context.');
      });

      it('should throw (an entry misses "msgid_plural")', async () => {
        const po = await readFile(path.join(__dirname, 'fixtures/validate-missing-msgid-plural.po'));

        expect(gettextParser.po.parse.bind(gettextParser.po, po, options)).to.throw('Translation string range error: Extected 1 msgstr definitions associated with "o1-1" in "" context, found 2.');
      });

      it('should throw (an entry misses single "msgstr")', async () => {
        const po = await readFile(path.join(__dirname, 'fixtures/validate-missing-msgstr.po'));

        expect(gettextParser.po.parse.bind(gettextParser.po, po, options)).to.throw('Translation string range error: Extected 1 msgstr definitions associated with "o1" in "" context, found 0.');
      });

      it('should throw (duplicate entries found in the same context)', async () => {
        const po = await readFile(path.join(__dirname, 'fixtures/validate-context-duplicate-entries.po'));

        expect(gettextParser.po.parse.bind(gettextParser.po, po, options)).to.throw('Duplicate msgid error: entry "o1-1" in "c2" context has already been declared.');
      });

      it('should throw (an entry with multiple "msgid_plural")', async () => {
        const po = await readFile(path.join(__dirname, 'fixtures/validate-redundant-msgid-plural.po'));

        expect(gettextParser.po.parse.bind(gettextParser.po, po, options)).to.throw('Multiple msgid_plural error: entry "o1-1" in "" context has multiple msgid_plural declarations.');
      });
    });
  });
});
