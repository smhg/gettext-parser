'use strict';

const chai = require('chai');
const gettextParser = require('..');
const fs = require('fs');
const path = require('path');

const expect = chai.expect;
chai.config.includeStack = true;

describe('MO Parser', () => {
  describe('UTF-8', () => {
    it('should parse', () => {
      const mo = fs.readFileSync(path.join(__dirname, 'fixtures/utf8.mo'));
      const json = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/utf8-mo.json'), 'utf-8'));
      const parsed = gettextParser.mo.parse(mo);
      expect(parsed).to.deep.equal(json);
    });
  });

  describe('Latin-13', () => {
    it('should parse', () => {
      const mo = fs.readFileSync(path.join(__dirname, 'fixtures/latin13.mo'));
      const json = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/latin13-mo.json'), 'utf-8'));
      const parsed = gettextParser.mo.parse(mo);
      expect(parsed).to.deep.equal(json);
    });
  });
});
