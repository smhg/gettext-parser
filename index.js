const { parse, stream } = require('./lib/poparser');

module.exports = {
  po: {
    parse,
    createParseStream: stream,
    compile: require('./lib/pocompiler')
  },

  mo: {
    parse: require('./lib/moparser'),
    compile: require('./lib/mocompiler')
  }
};
