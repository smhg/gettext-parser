const { EOL } = require('os');
const {
  expect,
  config
} = require('chai');
const path = require('path');
const { readFile } = require('fs').promises;
const {
  po,
  mo
} = require('..');

config.includeStack = true;

describe('Obsolete', async () => {
  const [poFile, moFile, jsonString] = await Promise.all([
    readFile(path.join(__dirname, 'fixtures/obsolete.po')),
    readFile(path.join(__dirname, 'fixtures/obsolete.mo')),
    readFile(path.join(__dirname, 'fixtures/obsolete.json'), 'utf8')
  ]);

  const json = JSON.parse(jsonString);
  const poString = poFile.toString('utf8');
  const moString = moFile.toString('utf8');

  describe('PO Parser', () => {
    it('should parse obsolete messages', async () => {
      const parsed = po.parse(poFile);

      expect(parsed).to.deep.equal(json);
    });
  });
  describe('PO Compiler', () => {
    it('should compile obsolete messages', async () => {
      const compiled = po.compile(json, { eol: EOL }).toString('utf8');

      expect(compiled).to.be.equal(poString);
    });
  });
  describe('MO Compiler', () => {
    it('should ignore obsolete messages', async () => {
      const compiled = mo.compile(json).toString('utf8');

      expect(compiled).to.be.equal(moString);
    });
  });
});
