import * as poParser from './poparser.js';
import poCompiler from './pocompiler.js';
import moParser from './moparser.js';
import moCompiler from './mocompiler.js';

/**
 * Translation parser and compiler for PO files
 * @see https://www.gnu.org/software/gettext/manual/html_node/PO.html
 *
 * @type {import("./index.js").PoParser} po
 */
export const po = {
  parse: poParser.parse,
  createParseStream: poParser.stream,
  compile: poCompiler
};

/**
 * Translation parser and compiler for PO files
 * @see https://www.gnu.org/software/gettext/manual/html_node/MO.html
 *
 * @type {import("./index.js").MoParser} mo
 */
export const mo= {
  parse: moParser,
  compile: moCompiler
};
