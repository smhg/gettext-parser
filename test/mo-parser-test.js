const {
  expect,
  config
} = require('chai');
const { join } = require('path');
const { mo: { parse } } = require('..');
const { readFile } = require('fs').promises;

config.includeStack = true;

describe('MO Parser', () => {
  describe('UTF-8', () => {
    it('should parse', async () => {
      const [mo, json] = await Promise.all([
        readFile(join(__dirname, 'fixtures/utf8.mo')),
        readFile(join(__dirname, 'fixtures/utf8-mo.json'), 'utf8')
      ]);

      const parsed = parse(mo);

      expect(parsed).to.deep.equal(JSON.parse(json));
    });
  });

  describe('Latin-13', () => {
    it('should parse', async () => {
      const [mo, json] = await Promise.all([
        readFile(join(__dirname, 'fixtures/latin13.mo')),
        readFile(join(__dirname, 'fixtures/latin13-mo.json'), 'utf8')
      ]);

      const parsed = parse(mo);

      expect(parsed).to.deep.equal(JSON.parse(json));
    });
  });
});
