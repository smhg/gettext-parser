'use strict';

const chai = require('chai');
const gettextParser = require('..');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const readFile = promisify(fs.readFile);

const expect = chai.expect;
chai.config.includeStack = true;

describe('PO Compiler', () => {
  describe('Headers', () => {
    it('should compile', async () => {
      const [json, po] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/headers.json'), 'utf8'),
        readFile(path.join(__dirname, 'fixtures/headers.po'), 'utf8')
      ]);

      const compiled = gettextParser.po.compile(JSON.parse(json)).toString('utf8');
      expect(compiled).to.equal(po);
    });
  });

  describe('UTF-8', () => {
    it('should compile', () => {
      const json = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/utf8-po.json'), 'utf8'));
      const po = fs.readFileSync(path.join(__dirname, 'fixtures/utf8.po'));

      const compiled = gettextParser.po.compile(json);
      expect(compiled).to.deep.equal(po);
    });
  });

  describe('Latin-13', () => {
    it('should compile', () => {
      const json = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/latin13-po.json'), 'utf8'));
      const po = fs.readFileSync(path.join(__dirname, 'fixtures/latin13.po'));
      const compiled = gettextParser.po.compile(json);
      expect(compiled).to.deep.equal(po);
    });
  });

  describe('Plurals', () => {
    it('should compile correct plurals in POT files', () => {
      const json = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/plural-pot.json'), 'utf8'));
      const pot = fs.readFileSync(path.join(__dirname, 'fixtures/plural.pot'));
      const compiled = gettextParser.po.compile(json);
      expect(compiled).to.deep.equal(pot);
    });
  });

  describe('Message folding', () => {
    it('should compile without folding', () => {
      const json = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/utf8-po.json'), 'utf8'));
      const po = fs.readFileSync(path.join(__dirname, 'fixtures/utf8-no-folding.po'));

      const compiled = gettextParser.po.compile(json, { foldLength: 0 });
      expect(compiled.toString()).to.deep.equal(po.toString());
      expect(compiled).to.deep.equal(po);
    });

    it('should compile with different folding', () => {
      const json = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/utf8-po.json'), 'utf8'));
      const po = fs.readFileSync(path.join(__dirname, 'fixtures/utf8-folding-100.po'));

      const compiled = gettextParser.po.compile(json, { foldLength: 100 });
      expect(compiled).to.deep.equal(po);
    });
  });

  describe('Sorting', () => {
    it('should sort output entries by msgid when `sort` is `true`', () => {
      const json = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/sort-test.json'), 'utf8'));
      const pot = fs.readFileSync(path.join(__dirname, 'fixtures/sort-test.pot'));
      const compiled = gettextParser.po.compile(json, { sort: true });
      expect(compiled.toString()).to.deep.equal(pot.toString());
    });

    it('should sort entries using a custom `sort` function', () => {
      function compareMsgidAndMsgctxt (entry1, entry2) {
        if (entry1.msgid > entry2.msgid) {
          return 1;
        }
        if (entry2.msgid > entry1.msgid) {
          return -1;
        }
        if (entry1.msgctxt > entry2.msgctxt) {
          return 1;
        }
        if (entry2.msgctxt > entry1.msgctxt) {
          return -1;
        }
        return 0;
      }

      const json1 = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/sort-with-msgctxt-test-1.json'), 'utf8'));
      const json2 = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/sort-with-msgctxt-test-2.json'), 'utf8'));
      const pot = fs.readFileSync(path.join(__dirname, 'fixtures/sort-with-msgctxt-test.pot'));
      const compiled1 = gettextParser.po.compile(json1, { sort: compareMsgidAndMsgctxt });
      const compiled2 = gettextParser.po.compile(json2, { sort: compareMsgidAndMsgctxt });
      expect(compiled1.toString()).to.deep.equal(compiled2.toString());
      expect(compiled1.toString()).to.deep.equal(pot.toString());
      expect(compiled2.toString()).to.deep.equal(pot.toString());
    });
  });
});
