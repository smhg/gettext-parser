import { describe, it } from 'node:test';
import assert from 'node:assert';
import { promisify } from 'util';
import path from 'path';
import { mo } from '../index.js';
import { readFile as fsReadFile } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readFile = promisify(fsReadFile);

describe('MO Parser', () => {
  describe('UTF-8', () => {
    it('should parse', async () => {
      const [moData, json] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/utf8.mo')),
        readFile(path.join(__dirname, 'fixtures/utf8-mo.json'), 'utf8')
      ]);

      const parsed = mo.parse(moData);

      assert.deepStrictEqual(parsed, JSON.parse(json));
    });
  });

  describe('Latin-13', () => {
    it('should parse', async () => {
      const [moData, json] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/latin13.mo')),
        readFile(path.join(__dirname, 'fixtures/latin13-mo.json'), 'utf8')
      ]);

      const parsed = mo.parse(moData);

      assert.deepStrictEqual(parsed, JSON.parse(json));
    });
  });
});
