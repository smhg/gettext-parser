import * as poParser from './poparser.js';
import poCompiler from './pocompiler.js';
import moParser from './moparser.js';
import moCompiler from './mocompiler.js';

export const po = {
  parse: poParser.parse,
  createParseStream: poParser.stream,
  compile: poCompiler
};

export const mo = {
  parse: moParser,
  compile: moCompiler
};

export default { mo, po };
