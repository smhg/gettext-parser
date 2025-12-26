import { EOL } from 'os';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import * as gettextParser from '../index.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readFile = promisify(fs.readFile);

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

      assert.deepStrictEqual(parsed, json);
    });
  });
  describe('PO Compiler', () => {
    it('should compile obsolete messages', async () => {
      const compiled = gettextParser.po.compile(json, { eol: EOL }).toString('utf8');

      assert.strictEqual(compiled, poString);
    });
  });
  describe('MO Compiler', () => {
    it('should ignore obsolete messages', async () => {
      const compiled = gettextParser.mo.compile(json).toString('utf8');

      assert.strictEqual(compiled, moString);
    });
  });
});
