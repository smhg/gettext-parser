'use strict';

const chai = require('chai');
const { promisify } = require('util');
const path = require('path');
const readFile = promisify(require('fs').readFile);
const { mo: { parse } } = require('..');

const expect = chai.expect;
chai.config.includeStack = true;

describe('MO Parser', () => {
  describe('UTF-8', () => {
    it('should parse', async () => {
      const [mo, json] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/utf8.mo')),
        readFile(path.join(__dirname, 'fixtures/utf8-mo.json'), 'utf-8')
      ]);

      const parsed = parse(mo);

      expect(parsed).to.deep.equal(JSON.parse(json));
    });
  });

  describe('Latin-13', () => {
    it('should parse', async () => {
      const [mo, json] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/latin13.mo')),
        readFile(path.join(__dirname, 'fixtures/latin13-mo.json'), 'latin1')
      ]);

      const parsed = parse(mo);

      expect(parsed).to.deep.equal(JSON.parse(json));
    });
  });
});
