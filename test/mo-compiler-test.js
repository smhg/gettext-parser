import { describe, it } from 'node:test';
import * as chai from 'chai';
import { promisify } from 'util';
import path from 'path';
import { mo } from '../index.js';
import { readFile as fsReadFile } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readFile = promisify(fsReadFile);

const expect = chai.expect;
chai.config.includeStack = true;

describe('MO Compiler', () => {
  describe('UTF-8', () => {
    it('should compile', async () => {
      const [json, moData] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/utf8-po.json'), 'utf8'),
        readFile(path.join(__dirname, 'fixtures/utf8.mo'))
      ]);

      const compiled = mo.compile(JSON.parse(json));

      expect(compiled.toString('utf8')).to.deep.equal(moData.toString('utf8'));
    });
  });

  describe('Latin-13', () => {
    it('should compile', async () => {
      const [json, moData] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/latin13-po.json'), 'utf8'),
        readFile(path.join(__dirname, 'fixtures/latin13.mo'))
      ]);

      const compiled = mo.compile(JSON.parse(json));

      expect(compiled.toString('utf8')).to.equal(moData.toString('utf8'));
    });
  });
});
