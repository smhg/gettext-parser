import { promisify } from 'node:util';
import path from 'node:path';
import { mo } from '../src/index.js';
import { readFile as fsReadFile } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as chai from 'chai';

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
