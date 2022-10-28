const {
  expect,
  config
} = require('chai');
const { join } = require('path');
const { mo: { compile } } = require('..');
const { readFile } = require('fs').promises;

config.includeStack = true;

describe('MO Compiler', () => {
  describe('UTF-8', () => {
    it('should compile', async () => {
      const [json, mo] = await Promise.all([
        readFile(join(__dirname, 'fixtures/utf8-po.json'), 'utf8'),
        readFile(join(__dirname, 'fixtures/utf8.mo'))
      ]);

      const compiled = compile(JSON.parse(json));

      expect(compiled.toString('utf8')).to.deep.equal(mo.toString('utf8'));
    });
  });

  describe('Latin-13', () => {
    it('should compile', async () => {
      const [json, mo] = await Promise.all([
        readFile(join(__dirname, 'fixtures/latin13-po.json'), 'utf8'),
        readFile(join(__dirname, 'fixtures/latin13.mo'))
      ]);

      const compiled = compile(JSON.parse(json));

      expect(compiled.toString('utf8')).to.equal(mo.toString('utf8'));
    });
  });
});
