'use strict';

const chai = require('chai');
const gettextParser = require('..');
const fs = require('fs');
const path = require('path');

const expect = chai.expect;
chai.config.includeStack = true;

describe('MO Compiler', () => {
  describe('UTF-8', () => {
    it('should compile', () => {
      const json = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/utf8-mo.json'), 'utf-8'));
      const mo = fs.readFileSync(path.join(__dirname, 'fixtures/utf8.mo'));

      const compiled = gettextParser.mo.compile(json);
      expect(compiled).to.deep.equal(mo);
    });
  });

  describe('Latin-13', () => {
    it('should compile', () => {
      const json = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/latin13-mo.json'), 'utf-8'));
      const mo = fs.readFileSync(path.join(__dirname, 'fixtures/latin13.mo'));
      const compiled = gettextParser.mo.compile(json);
      expect(compiled).to.deep.equal(mo);
    });
  });
});
