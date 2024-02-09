'use strict';

import chai from 'chai';
import { promisify } from 'util';
import path from 'path';
import { formatCharset, parseHeader, generateHeader, foldLine, parseNPluralFromHeadersSafely } from '../lib/shared.js';
import { readFile as fsReadFile } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readFile = promisify(fsReadFile);

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

  describe('parseHeader', () => {
    it('should return an empty object by default', () => {
      expect(parseHeader()).to.deep.equal({});
    });

    it('should convert a header string into an object', async () => {
      const str = `Project-Id-Version: project 1.0.2
POT-Creation-Date: 2012-05-18 14:28:00+03:00
content-type: text/plain; charset=utf-8
Plural-Forms: nplurals=2; plural=(n!=1);
mime-version: 1.0
X-Poedit-SourceCharset: UTF-8`;

      const headers = parseHeader(str);

      expect(headers).to.have.all.keys(
        'Project-Id-Version',
        'POT-Creation-Date',
        'Content-Type',
        'Plural-Forms',
        'mime-version',
        'X-Poedit-SourceCharset'
      );
    });
  });

  describe('generateHeader', () => {
    it('should return an empty string by default', () => {
      expect(generateHeader()).to.equal('');
    });

    it('should convert a header object into a string', async () => {
      const json = await readFile(path.join(__dirname, 'fixtures/headers-case.json'), 'utf8');
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

  describe('foldLine', () => {
    it('should not fold when not necessary', () => {
      const line = 'abc def ghi';
      const folded = foldLine(line);

      expect(line).to.equal(folded.join(''));
      expect(folded.length).to.equal(1);
    });

    it('should force fold with newline', () => {
      const line = 'abc \\ndef \\nghi';
      const folded = foldLine(line);

      expect(line).to.equal(folded.join(''));
      expect(folded).to.deep.equal(['abc \\n', 'def \\n', 'ghi']);
      expect(folded.length).to.equal(3);
    });

    it('should fold at default length', () => {
      const expected = ['Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum pretium ',
        'a nunc ac fringilla. Nulla laoreet tincidunt tincidunt. Proin tristique ',
        'vestibulum mauris non aliquam. Vivamus volutpat odio nisl, sed placerat ',
        'turpis sodales a. Vestibulum quis lectus ac elit sagittis sodales ac a ',
        'felis. Nulla iaculis, nisl ut mattis fringilla, tortor quam tincidunt ',
        'lorem, quis feugiat purus felis ut velit. Donec euismod eros ut leo ',
        'lobortis tristique.'
      ];
      const folded = foldLine(expected.join(''));
      expect(folded).to.deep.equal(expected);
      expect(folded.length).to.equal(7);
    });

    it('should force fold white space', () => {
      const line = 'abc def ghi';
      const folded = foldLine(line, 5);

      expect(line).to.equal(folded.join(''));
      expect(folded).to.deep.equal(['abc ', 'def ', 'ghi']);
      expect(folded.length).to.equal(3);
    });

    it('should ignore leading spaces', () => {
      const line = '    abc def ghi';
      const folded = foldLine(line, 5);

      expect(line).to.equal(folded.join(''));
      expect(folded).to.deep.equal(['    a', 'bc ', 'def ', 'ghi']);
      expect(folded.length).to.equal(4);
    });

    it('should force fold special character', () => {
      const line = 'abcdef--ghi';
      const folded = foldLine(line, 5);

      expect(line).to.equal(folded.join(''));
      expect(folded).to.deep.equal(['abcde', 'f--', 'ghi']);
      expect(folded.length).to.equal(3);
    });

    it('should force fold last special character', () => {
      const line = 'ab--cdef--ghi';
      const folded = foldLine(line, 10);

      expect(line).to.equal(folded.join(''));
      expect(folded).to.deep.equal(['ab--cdef--', 'ghi']);
      expect(folded.length).to.equal(2);
    });

    it('should force fold only if at least one non-special character', () => {
      const line = '--abcdefghi';
      const folded = foldLine(line, 5);

      expect(line).to.equal(folded.join(''));
      expect(folded).to.deep.equal(['--abc', 'defgh', 'i']);
      expect(folded.length).to.equal(3);
    });
  });

  describe('parseNPluralFromHeadersSafely', () => {
    it('should return parsed value', () => {
      const headers = { 'Plural-Forms': 'nplurals=10; plural=n' };
      const nplurals = parseNPluralFromHeadersSafely(headers);

      expect(nplurals).to.equal(10);
    });

    it('should return parsed value (missing plural declaration)', () => {
      const headers = { 'Plural-Forms': 'nplurals=10' };
      const nplurals = parseNPluralFromHeadersSafely(headers);

      expect(nplurals).to.equal(10);
    });

    it('should return fallback value ("Plural-Forms" header is absent)', () => {
      const nplurals = parseNPluralFromHeadersSafely();

      expect(nplurals).to.equal(1);
    });

    it('should return fallback value (nplurals is not declared)', () => {
      const headers = { 'Plural-Forms': '; plural=n' };
      const nplurals = parseNPluralFromHeadersSafely(headers);

      expect(nplurals).to.equal(1);
    });

    it('should return fallback value (nplurals is set to zero)', () => {
      const headers = { 'Plural-Forms': 'nplurals=0' };
      const nplurals = parseNPluralFromHeadersSafely(headers);

      expect(nplurals).to.equal(1);
    });

    it('should return fallback value (nplurals is set to negative value)', () => {
      const headers = { 'Plural-Forms': 'nplurals=-99' };
      const nplurals = parseNPluralFromHeadersSafely(headers);

      expect(nplurals).to.equal(1);
    });

    it('should return fallback value (failed to parse nplurals value)', () => {
      const headers = { 'Plural-Forms': 'nplurals=foo' };
      const nplurals = parseNPluralFromHeadersSafely(headers);

      expect(nplurals).to.equal(1);
    });
  });
});
