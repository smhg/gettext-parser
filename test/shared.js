'use strict';

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { promisify } from 'node:util';
import path from 'node:path';
import { formatCharset, parseHeader, generateHeader, foldLine, parseNPluralFromHeadersSafely } from '../lib/shared.js';
import { readFile as fsReadFile } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readFile = promisify(fsReadFile);

describe('Shared functions', () => {
  describe('formatCharset', () => {
    it('should default to iso-8859-1', () => {
      assert.strictEqual(formatCharset(), 'iso-8859-1');
    });

    it('should normalize UTF8 to utf-8', () => {
      assert.strictEqual(formatCharset('UTF8'), 'utf-8');
    });
  });

  describe('parseHeader', () => {
    it('should return an empty object by default', () => {
      assert.deepStrictEqual(parseHeader(), {});
    });

    it('should convert a header string into an object', async () => {
      const str = `Project-Id-Version: project 1.0.2
POT-Creation-Date: 2012-05-18 14:28:00+03:00
content-type: text/plain; charset=utf-8
Plural-Forms: nplurals=2; plural=(n!=1);
mime-version: 1.0
X-Poedit-SourceCharset: UTF-8`;

      const headers = parseHeader(str);

      const expectedKeys = [
        'Project-Id-Version',
        'POT-Creation-Date',
        'Content-Type',
        'Plural-Forms',
        'mime-version',
        'X-Poedit-SourceCharset'
      ];
      const actualKeys = Object.keys(headers);
      for (const key of expectedKeys) {
        assert(actualKeys.includes(key), `Expected headers to have key "${key}"`);
      }
      assert.strictEqual(actualKeys.length, expectedKeys.length);
    });
  });

  describe('generateHeader', () => {
    it('should return an empty string by default', () => {
      assert.strictEqual(generateHeader(), '');
    });

    it('should convert a header object into a string', async () => {
      const json = await readFile(path.join(__dirname, 'fixtures/headers-case.json'), 'utf8');
      const { headers } = JSON.parse(json);

      const headerKeys = Object.keys(headers);
      const headerString = generateHeader(headers);

      headerKeys.forEach(key => {
        assert(headerString.includes(key), `Expected header string to include key "${key}"`);
        assert(headerString.includes(headers[key]), `Expected header string to include value "${headers[key]}"`);
      });

      assert.match(headerString, /\n$/, 'Non-empty header has to end with newline');
    });
  });

  describe('foldLine', () => {
    it('should not fold when not necessary', () => {
      const line = 'abc def ghi';
      const folded = foldLine(line);

      assert.strictEqual(line, folded.join(''));
      assert.strictEqual(folded.length, 1);
    });

    // Where exactly a line is folded is decided by GNU gettext's algorithm and
    // covered by test/fixtures/wrapping-msgcat.po. The tests below only pin
    // the invariants of foldLine itself. A leading empty piece (GNU's
    // `msgid ""` first line) is allowed and ignored.

    it('should force fold with newline', () => {
      const line = 'abc \\ndef \\nghi';
      const folded = foldLine(line);

      assert.strictEqual(line, folded.join(''));
      assert.deepStrictEqual(folded.filter(Boolean), ['abc \\n', 'def \\n', 'ghi']);
    });

    it('should end a piece at every escaped newline', () => {
      const line = [
        'First line of a multi-line message.',
        'Second line, which is a bit longer than the first one and therefore needs to be wrapped.',
        '',
        'Fourth line.'
      ].join('\\n') + '\\n';

      for (const width of [5, 20, 79, 200]) {
        const folded = foldLine(line, width);

        assert.strictEqual(line, folded.join(''));
        for (const piece of folded) {
          const at = piece.indexOf('\\n');
          if (at !== -1) {
            assert.strictEqual(at, piece.length - 2, `width ${width}: "${piece}" continues after \\n`);
          }
        }
      }
    });

    it('should never split an escape sequence', () => {
      const line = 'Press \\"Save\\" to store C:\\\\Users\\\\name\\\\file.txt or press\\t\\"Cancel\\"; '.repeat(4);

      for (let width = 5; width <= 80; width++) {
        const folded = foldLine(line, width);

        assert.strictEqual(line, folded.join(''));
        for (const piece of folded) {
          const trailingBackslashes = (/\\+$/.exec(piece) || [''])[0].length;
          assert.strictEqual(trailingBackslashes % 2, 0, `width ${width}: "${piece}" ends inside an escape sequence`);
        }
      }
    });

    it('should count the key name towards the width', () => {
      // `msgid "…"` is 75 columns, `msgid_plural "…"` would be 82
      const line = `${'a'.repeat(33)} ${'b'.repeat(33)}`;

      assert.strictEqual(foldLine(line, 79, { name: 'msgid' }).length, 1);
      assert.ok(foldLine(line, 79, { name: 'msgid_plural' }).length > 1);
    });

    it('should count the obsolete prefix towards the width', () => {
      const word = 'x'.repeat(37);
      const line = [word, word, word, word].join(' ');
      const regular = foldLine(line, 79, { name: 'msgid' });
      const obsolete = foldLine(line, 79, { name: 'msgid', obsolete: true });

      assert.strictEqual(line, regular.join(''));
      assert.strictEqual(line, obsolete.join(''));
      // two words fit on a `"…"` line, but not on a `#~ "…"` line
      assert.ok(regular.some(piece => piece.length > 79 - 2 - 3));
      assert.ok(obsolete.every(piece => piece.length <= 79 - 2 - 3));
    });
  });

  describe('parseNPluralFromHeadersSafely', () => {
    it('should return parsed value', () => {
      const headers = { 'Plural-Forms': 'nplurals=10; plural=n' };
      const nplurals = parseNPluralFromHeadersSafely(headers);

      assert.strictEqual(nplurals, 10);
    });

    it('should return parsed value (missing plural declaration)', () => {
      const headers = { 'Plural-Forms': 'nplurals=10' };
      const nplurals = parseNPluralFromHeadersSafely(headers);

      assert.strictEqual(nplurals, 10);
    });

    it('should return fallback value ("Plural-Forms" header is absent)', () => {
      const nplurals = parseNPluralFromHeadersSafely();

      assert.strictEqual(nplurals, 1);
    });

    it('should return fallback value (nplurals is not declared)', () => {
      const headers = { 'Plural-Forms': '; plural=n' };
      const nplurals = parseNPluralFromHeadersSafely(headers);

      assert.strictEqual(nplurals, 1);
    });

    it('should return fallback value (nplurals is set to zero)', () => {
      const headers = { 'Plural-Forms': 'nplurals=0' };
      const nplurals = parseNPluralFromHeadersSafely(headers);

      assert.strictEqual(nplurals, 1);
    });

    it('should return fallback value (nplurals is set to negative value)', () => {
      const headers = { 'Plural-Forms': 'nplurals=-99' };
      const nplurals = parseNPluralFromHeadersSafely(headers);

      assert.strictEqual(nplurals, 1);
    });

    it('should return fallback value (failed to parse nplurals value)', () => {
      const headers = { 'Plural-Forms': 'nplurals=foo' };
      const nplurals = parseNPluralFromHeadersSafely(headers);

      assert.strictEqual(nplurals, 1);
    });
  });
});
