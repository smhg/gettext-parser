const chai = require('chai');
const { promisify } = require('util');
const path = require('path');
const { mo: { compile } } = require('..');
const readFile = promisify(require('fs').readFile);

const expect = chai.expect;
chai.config.includeStack = true;

describe('MO Compiler', () => {
  describe('UTF-8', () => {
    it('should compile', async () => {
      const [json, mo] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/utf8-po.json'), 'utf8'),
        readFile(path.join(__dirname, 'fixtures/utf8.mo'))
      ]);

      const compiled = compile(JSON.parse(json));

      expect(compiled.toString('utf8')).to.deep.equal(mo.toString('utf8'));
    });
  });

  describe('Latin-13', () => {
    it('should compile', async () => {
      const [json, mo] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/latin13-po.json'), 'utf8'),
        readFile(path.join(__dirname, 'fixtures/latin13.mo'), 'latin1'),
        readFile(path.join(__dirname, 'fixtures/latin13.po'), 'latin1')
      ]);

      // gettext-parser only handles utf8 input (output will be the specified charset)
      const compiled = compile(JSON.parse(json))
        .toString('latin1');

      expect(compiled).to.deep.equal(mo);
    });
  });
});
