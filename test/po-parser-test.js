'use strict';

const chai = require('chai');
const gettextParser = require('..');
const fs = require('fs');
const path = require('path');

const expect = chai.expect;
chai.config.includeStack = true;

describe('PO Parser', () => {
  describe('UTF-8', () => {
    it('should parse', () => {
      const po = fs.readFileSync(path.join(__dirname, 'fixtures/utf8.po'));
      const json = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/utf8-po.json'), 'utf-8'));
      const parsed = gettextParser.po.parse(po);
      expect(parsed).to.deep.equal(json);
    });
  });

  describe('UTF-8 as a string', () => {
    it('should parse', () => {
      const po = fs.readFileSync(path.join(__dirname, 'fixtures/utf8.po'), 'utf-8');
      const json = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/utf8-po.json'), 'utf-8'));
      const parsed = gettextParser.po.parse(po);
      expect(parsed).to.deep.equal(json);
    });
  });

  describe('Stream input', () => {
    it('should parse', done => {
      const po = fs.createReadStream(path.join(__dirname, 'fixtures/utf8.po'), {
        highWaterMark: 1 // ensure that any utf-8 sequences will be broken when streaming
      });
      const json = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/utf8-po.json'), 'utf-8'));

      let parsed;
      const stream = po.pipe(gettextParser.po.createParseStream({
        initialTreshold: 800 // home many bytes to cache for parsing the header
      }));
      stream.on('data', data => {
        parsed = data;
      });
      stream.on('end', () => {
        expect(parsed).to.deep.equal(json);
        done();
      });
    });
  });

  describe('Latin-13', () => {
    it('should parse', () => {
      const po = fs.readFileSync(path.join(__dirname, 'fixtures/latin13.po'));
      const json = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/latin13-po.json'), 'utf-8'));
      const parsed = gettextParser.po.parse(po);
      expect(parsed).to.deep.equal(json);
    });
  });

  describe('parsing errors', () => {
    it('should throw (unescaped quote)', () => {
      const po = fs.readFileSync(path.join(__dirname, 'fixtures/error-unescaped-quote.po'));
      expect(gettextParser.po.parse.bind(gettextParser.po, po)).to.throw(/Parsing error: Invalid key name/);
    });

    it('should throw (double-escaped quote)', () => {
      const po = fs.readFileSync(path.join(__dirname, 'fixtures/error-double-escaped-quote.po'));
      expect(gettextParser.po.parse.bind(gettextParser.po, po)).to.throw(/Parsing error: Invalid key name/);
    });
  });
});
