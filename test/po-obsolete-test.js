const { EOL } = require('os');
const chai = require('chai');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const gettextParser = require('..');

const readFile = promisify(fs.readFile);

const expect = chai.expect;
chai.config.includeStack = true;

describe('Obsolete', async () => {
  const [po, mo, jsonString] = await Promise.all([
    readFile(path.join(__dirname, 'fixtures/obsolete.po')),
    readFile(path.join(__dirname, 'fixtures/obsolete.mo')),
    readFile(path.join(__dirname, 'fixtures/obsolete.json'), 'utf8')
  ]);

  const json = JSON.parse(jsonString);
  const poString = po.toString('utf8');
  const moString = mo.toString('utf8');

  describe('PO Parser', () => {
    it('should parse obsolete messages', async () => {
      const parsed = gettextParser.po.parse(po);

      expect(parsed).to.deep.equal(json);
    });
  });
  describe('PO Compiler', () => {
    it('should compile obsolete messages', async () => {
      const compiled = gettextParser.po.compile(json, { eol: EOL }).toString('utf8');

      expect(compiled).to.be.equal(poString);
    });
  });
  describe('MO Compiler', () => {
    it('should ignore obsolete messages', async () => {
      const compiled = gettextParser.mo.compile(json).toString('utf8');

      expect(compiled).to.be.equal(moString);
    });
  });
});
