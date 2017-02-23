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

  describe('Sorting', function () {
    it('should sort output entries by msgid', function () {
      var json = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/sort-test.json'), 'utf-8'));
      var pot = fs.readFileSync(path.join(__dirname, 'fixtures/sort-test.pot'));
      var compiled = gettextParser.po.compile(json, { sortByMsgid: true });
      expect(compiled.toString()).to.deep.equal(pot.toString());
    });
  });
});
