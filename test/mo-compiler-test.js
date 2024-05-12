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

const littleEndianMagic = [0xde, 0x12, 0x04, 0x95];
const bigEndianMagic = [0x95, 0x04, 0x12, 0xde];

chai.config.includeStack = true;

describe('MO Compiler', () => {
  describe('UTF-8 LE', async () => {
    it('should compile', async () => {
      const [json, moData] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/utf8-po.json'), 'utf8'),
        readFile(path.join(__dirname, 'fixtures/utf8-le.mo'))
      ]);

      const compiled = mo.compile(JSON.parse(json));

      expect(compiled.toString('utf8')).to.deep.equal(moData.toString('utf8'));
    });

    it('should have the correct magic number', async () => {
      const json = await readFile(path.join(__dirname, 'fixtures/utf8-po.json'), 'utf8');

      const compiled = mo.compile(JSON.parse(json));

      expect(Array.from(compiled.subarray(0, 4))).to.eql(littleEndianMagic);
    });
  });

  describe('UTF-8 BE', () => {
    it('should compile', async () => {
      const [json, moData] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/utf8-po.json'), 'utf8'),
        readFile(path.join(__dirname, 'fixtures/utf8-be.mo'))
      ]);

      const compiled = mo.compile(JSON.parse(json), { endian: 'be' });

      expect(compiled.toString('utf8')).to.deep.equal(moData.toString('utf8'));
    });

    it('should have the correct magic number', async () => {
      const json = await readFile(path.join(__dirname, 'fixtures/utf8-po.json'), 'utf8');

      const compiled = mo.compile(JSON.parse(json), { endian: 'be' });

      expect(Array.from(compiled.subarray(0, 4))).to.eql(bigEndianMagic);
    });
  });

  describe('Latin-13 LE', () => {
    it('should compile', async () => {
      const [json, moData] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/latin13-po.json'), 'utf8'),
        readFile(path.join(__dirname, 'fixtures/latin13-le.mo'))
      ]);

      const compiled = mo.compile(JSON.parse(json));

      expect(compiled.toString('utf8')).to.equal(moData.toString('utf8'));
    });

    it('should have the correct magic number', async () => {
      const json = await readFile(path.join(__dirname, 'fixtures/latin13-po.json'), 'utf8');

      const compiled = mo.compile(JSON.parse(json));

      expect(Array.from(compiled.subarray(0, 4))).to.eql(littleEndianMagic);
    });
  });

  describe('Latin-13 BE', () => {
    it('should compile', async () => {
      const [json, moData] = await Promise.all([
        readFile(path.join(__dirname, 'fixtures/latin13-po.json'), 'utf8'),
        readFile(path.join(__dirname, 'fixtures/latin13-be.mo'))
      ]);

      const compiled = mo.compile(JSON.parse(json), { endian: 'be' });

      expect(compiled.toString('utf8')).to.equal(moData.toString('utf8'));
    });

    it('should have the correct magic number', async () => {
      const json = await readFile(path.join(__dirname, 'fixtures/latin13-po.json'), 'utf8');

      const compiled = mo.compile(JSON.parse(json), { endian: 'be' });

      expect(Array.from(compiled.subarray(0, 4))).to.eql(bigEndianMagic);
    });
  });
});
