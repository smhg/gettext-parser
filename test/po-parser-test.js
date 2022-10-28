const {
  expect,
  config
} = require('chai');
const { join } = require('path');
const {
  createReadStream,
  readFileSync
} = require('fs');
const { readFile } = require('fs').promises;
const { po } = require('..');

config.includeStack = true;

describe('PO Parser', () => {
  describe('headers', () => {
    it('should detect charset in header', async () => {
      const [poFile, json] = await Promise.all([
        readFile(join(__dirname, 'fixtures/headers-charset.po')),
        readFile(join(__dirname, 'fixtures/headers-charset.json'), 'utf8')
      ]);

      const parsed = po.parse(poFile);

      expect(parsed).to.deep.equal(JSON.parse(json));
    });
  });

  describe('UTF-8', () => {
    it('should parse', async () => {
      const [poFile, json] = await Promise.all([
        readFile(join(__dirname, 'fixtures/utf8.po')),
        readFile(join(__dirname, 'fixtures/utf8-po.json'), 'utf8')
      ]);

      const parsed = po.parse(poFile);

      expect(parsed).to.deep.equal(JSON.parse(json));
    });
  });

  describe('UTF-8 as a string', () => {
    it('should parse', async () => {
      const [poFile, json] = await Promise.all([
        readFile(join(__dirname, 'fixtures/utf8.po'), 'utf8'),
        readFile(join(__dirname, 'fixtures/utf8-po.json'), 'utf8')
      ]);

      const parsed = po.parse(poFile);

      expect(parsed).to.deep.equal(JSON.parse(json));
    });
  });

  describe('Stream input', () => {
    it('should parse', done => {
      const poStream = createReadStream(join(__dirname, 'fixtures/utf8.po'), {
        highWaterMark: 1 // ensure that any utf-8 sequences will be broken when streaming
      });

      const json = readFileSync(join(__dirname, 'fixtures/utf8-po.json'), 'utf8');

      let parsed;

      const stream = poStream.pipe(po.createParseStream({
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
      const [poFile, json] = await Promise.all([
        readFile(join(__dirname, 'fixtures/latin13.po')),
        readFile(join(__dirname, 'fixtures/latin13-po.json'), 'utf8')
      ]);

      const parsed = po.parse(poFile);

      expect(parsed).to.deep.equal(JSON.parse(json));
    });
  });

  describe('parsing errors', () => {
    const invalidKeyError = /Error parsing PO data: Invalid key name/;

    it('should throw (unescaped quote)', async () => {
      const poFile = await readFile(join(__dirname, 'fixtures/error-unescaped-quote.po'));

      expect(po.parse.bind(null, poFile)).to.throw(invalidKeyError);
    });

    it('should throw (double-escaped quote)', async () => {
      const poFile = await readFile(join(__dirname, 'fixtures/error-double-escaped-quote.po'));

      expect(po.parse.bind(null, poFile)).to.throw(invalidKeyError);
    });

    it('should throw (stream with unescaped quote)', done => {
      const poStream = createReadStream(join(__dirname, 'fixtures/error-unescaped-quote.po'), {
        highWaterMark: 1 // ensure that any utf-8 sequences will be broken when streaming
      });

      const stream = poStream.pipe(po.createParseStream({
        initialTreshold: 800 // home many bytes to cache for parsing the header
      }));

      stream.on('error', error => {
        expect(error.message).to.match(invalidKeyError);
        done();
      });
    });
  });
});
