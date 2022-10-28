const {
  parse: poParse,
  stream: poStream
} = require('./lib/poparser');
const poCompile = require('./lib/pocompiler');
const moParse = require('./lib/moparser');
const moCompile = require('./lib/mocompiler');

const po = {
  parse: poParse,
  createParseStream: poStream,
  compile: poCompile
};

const mo = {
  parse: moParse,
  compile: moCompile
};

module.exports = {
  po,
  mo
};
