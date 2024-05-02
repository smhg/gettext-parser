import * as chai from 'chai';
import { promisify } from 'util';
import path from 'path';
import { mo } from '../lib/index.js';
import { readFile as fsReadFile } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readFile = promisify(fsReadFile);

const expect = chai.expect;
chai.config.includeStack = true;

describe('MO Parser', () => {
  describe('UTF-8', () => {
    it('should parse', async () => {
      const [moData, json] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/utf8.mo')),
        readFile(path.join(__dirname, 'fixtures/utf8-mo.json'), 'utf8')
      ]);

      const parsed = mo.parse(moData);

      expect(parsed).to.deep.equal(JSON.parse(json));
    });
  });

  describe('Latin-13', () => {
    it('should parse', async () => {
      const [moData, json] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/latin13.mo')),
        readFile(path.join(__dirname, 'fixtures/latin13-mo.json'), 'utf8')
      ]);

      const parsed = mo.parse(moData);

      expect(parsed).to.deep.equal(JSON.parse(json));
    });
  });
});
