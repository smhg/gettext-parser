import * as poParser from './lib/poparser.js';
import poCompiler from './lib/pocompiler.js';
import moParser from './lib/moparser.js';
import moCompiler from './lib/mocompiler.js';

/**
 * Translation parser and compiler for PO files
 * @see https://www.gnu.org/software/gettext/manual/html_node/PO.html
 *
 * @type {import("./index.d.ts").po} po
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
 * @type {import("./index.d.ts").mo} mo
 */
export const mo = {
  parse: moParser,
  compile: moCompiler
};

export default { mo, po };
