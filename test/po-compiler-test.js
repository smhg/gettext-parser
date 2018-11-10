'use strict';

var chai = require('chai');
var gettextParser = require('..');
var fs = require('fs');
var path = require('path');

var expect = chai.expect;
chai.config.includeStack = true;

describe('PO Compiler', function () {
  describe('UTF-8', function () {
    it('should compile', function () {
      var json = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/utf8-po.json'), 'utf-8'));
      var po = fs.readFileSync(path.join(__dirname, 'fixtures/utf8.po'));

      var compiled = gettextParser.po.compile(json);
      expect(compiled).to.deep.equal(po);
    });
  });

  describe('Latin-13', function () {
    it('should compile', function () {
      var json = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/latin13-po.json'), 'utf-8'));
      var po = fs.readFileSync(path.join(__dirname, 'fixtures/latin13.po'));
      var compiled = gettextParser.po.compile(json);
      expect(compiled).to.deep.equal(po);
    });
  });

  describe('Plurals', function () {
    it('should compile correct plurals in POT files', function () {
      var json = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/plural-pot.json'), 'utf-8'));
      var pot = fs.readFileSync(path.join(__dirname, 'fixtures/plural.pot'));
      var compiled = gettextParser.po.compile(json);
      expect(compiled).to.deep.equal(pot);
    });
  });

  describe('Message folding', function () {
    it('should compile without folding', function () {
      var json = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/utf8-po.json'), 'utf-8'));
      var po = fs.readFileSync(path.join(__dirname, 'fixtures/utf8-no-folding.po'));

      var compiled = gettextParser.po.compile(json, { foldLength: 0 });
      expect(compiled.toString()).to.deep.equal(po.toString());
      expect(compiled).to.deep.equal(po);
    });

    it('should compile with different folding', function () {
      var json = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/utf8-po.json'), 'utf-8'));
      var po = fs.readFileSync(path.join(__dirname, 'fixtures/utf8-folding-100.po'));

      var compiled = gettextParser.po.compile(json, { foldLength: 100 });
      expect(compiled).to.deep.equal(po);
    });
  });

  describe('Sorting', function () {
    it('should sort output entries by msgid when `sort` is `true`', function () {
      var json = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/sort-test.json'), 'utf-8'));
      var pot = fs.readFileSync(path.join(__dirname, 'fixtures/sort-test.pot'));
      var compiled = gettextParser.po.compile(json, { sort: true });
      expect(compiled.toString()).to.deep.equal(pot.toString());
    });

    it('should sort entries using a custom `sort` function', function () {
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

      var json1 = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/sort-with-msgctxt-test-1.json'), 'utf-8'));
      var json2 = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/sort-with-msgctxt-test-2.json'), 'utf-8'));
      var pot = fs.readFileSync(path.join(__dirname, 'fixtures/sort-with-msgctxt-test.pot'));
      var compiled1 = gettextParser.po.compile(json1, { sort: compareMsgidAndMsgctxt });
      var compiled2 = gettextParser.po.compile(json2, { sort: compareMsgidAndMsgctxt });
      expect(compiled1.toString()).to.deep.equal(compiled2.toString());
      expect(compiled1.toString()).to.deep.equal(pot.toString());
      expect(compiled2.toString()).to.deep.equal(pot.toString());
    });
  });
});
