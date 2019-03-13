'use strict';

const chai = require('chai');
const { promisify } = require('util');
const path = require('path');
const readFile = promisify(require('fs').readFile);
const { formatCharset, generateHeader } = require('../lib/shared');

const expect = chai.expect;
chai.config.includeStack = true;

describe('Shared functions', () => {
  describe('formatCharset', () => {
    it('should default to iso-8859-1', () => {
      expect(formatCharset()).to.equal('iso-8859-1');
    });

    it('should normalize UTF8 to utf-8', () => {
      expect(formatCharset('UTF8')).to.equal('utf-8');
    });
  });

  describe('generateHeader', () => {
    it('should return an empty string by default', () => {
      expect(generateHeader()).to.equal('');
    });

    it('should convert a header object into a string', async () => {
      const json = await readFile(path.join(__dirname, 'fixtures/headers.json'), 'utf8');
      const { headers } = JSON.parse(json);

      const headerKeys = Object.keys(headers);
      const headerString = generateHeader(headers);

      headerKeys.forEach(key => {
        expect(headerString).to.have.string(key);
        expect(headerString).to.have.string(headers[key]);
      });

      expect(headerString).to.match(/\n$/, 'Non-empty header has to end with newline');
    });
  });
});
