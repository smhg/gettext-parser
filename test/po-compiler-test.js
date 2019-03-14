const chai = require('chai');
const { promisify } = require('util');
const path = require('path');
const { po: { compile } } = require('..');
const readFile = promisify(require('fs').readFile);

const expect = chai.expect;
chai.config.includeStack = true;

describe('PO Compiler', () => {
  describe('UTF-8', () => {
    it('should compile', async () => {
      const [json, po] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/utf8-po.json'), 'utf8'),
        readFile(path.join(__dirname, 'fixtures/utf8.po'))
      ]);

      const compiled = compile(JSON.parse(json));

      expect(compiled).to.deep.equal(po);
    });
  });

  describe('Latin-13', () => {
    it('should compile', async () => {
      const [json, po] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/latin13-po.json'), 'utf8'),
        readFile(path.join(__dirname, 'fixtures/latin13.po'))
      ]);

      const compiled = compile(JSON.parse(json));

      expect(compiled).to.deep.equal(po);
    });
  });

  describe('Plurals', () => {
    it('should compile correct plurals in POT files', async () => {
      const [json, pot] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/plural-pot.json'), 'utf8'),
        readFile(path.join(__dirname, 'fixtures/plural.pot'))
      ]);

      const compiled = compile(JSON.parse(json));

      expect(compiled).to.deep.equal(pot);
    });
  });

  describe('Message folding', () => {
    it('should compile without folding', async () => {
      const [json, po] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/utf8-po.json'), 'utf8'),
        readFile(path.join(__dirname, 'fixtures/utf8-no-folding.po'))
      ]);

      const compiled = compile(JSON.parse(json), { foldLength: 0 });

      expect(compiled.toString()).to.deep.equal(po.toString());
      expect(compiled).to.deep.equal(po);
    });

    it('should compile with different folding', async () => {
      const [json, po] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/utf8-po.json'), 'utf8'),
        readFile(path.join(__dirname, 'fixtures/utf8-folding-100.po'))
      ]);

      const compiled = compile(JSON.parse(json), { foldLength: 100 });

      expect(compiled).to.deep.equal(po);
    });
  });

  describe('Sorting', () => {
    it('should sort output entries by msgid when `sort` is `true`', async () => {
      const [json, pot] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/sort-test.json'), 'utf8'),
        readFile(path.join(__dirname, 'fixtures/sort-test.pot'))
      ]);

      const compiled = compile(JSON.parse(json), { sort: true });

      expect(compiled.toString()).to.deep.equal(pot.toString());
    });

    it('should sort entries using a custom `sort` function', async () => {
      function compareMsgidAndMsgctxt (left, right) {
        if (left.msgid > right.msgid) {
          return 1;
        }

        if (right.msgid > left.msgid) {
          return -1;
        }

        if (left.msgctxt > right.msgctxt) {
          return 1;
        }

        if (right.msgctxt > left.msgctxt) {
          return -1;
        }

        return 0;
      }

      const [json1, json2, pot] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/sort-with-msgctxt-test-1.json'), 'utf8'),
        readFile(path.join(__dirname, 'fixtures/sort-with-msgctxt-test-2.json'), 'utf8'),
        readFile(path.join(__dirname, 'fixtures/sort-with-msgctxt-test.pot'))
      ]);

      const compiled1 = compile(JSON.parse(json1), { sort: compareMsgidAndMsgctxt });
      const compiled2 = compile(JSON.parse(json2), { sort: compareMsgidAndMsgctxt });

      expect(compiled1.toString()).to.deep.equal(compiled2.toString());
      expect(compiled1.toString()).to.deep.equal(pot.toString());
      expect(compiled2.toString()).to.deep.equal(pot.toString());
    });
  });
});
