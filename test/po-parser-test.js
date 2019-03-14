const chai = require('chai');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const gettextParser = require('..');

const readFile = promisify(fs.readFile);

const expect = chai.expect;
chai.config.includeStack = true;

describe('PO Parser', () => {
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

    it('should throw (unescaped quote)', async () => {
      const po = await readFile(path.join(__dirname, 'fixtures/error-unescaped-quote.po'));

      expect(gettextParser.po.parse.bind(gettextParser.po, po)).to.throw(invalidKeyError);
    });

    it('should throw (double-escaped quote)', async () => {
      const po = await readFile(path.join(__dirname, 'fixtures/error-double-escaped-quote.po'));

      expect(gettextParser.po.parse.bind(gettextParser.po, po)).to.throw(invalidKeyError);
    });

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
  });
});
