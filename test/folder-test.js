'use strict';

const chai = require('chai');
const sharedFuncs = require('../lib/shared');

const expect = chai.expect;
chai.config.includeStack = true;

describe('Folding tests', () => {
  it('No folding', () => {
    const line = 'abc def ghi';
    const folded = sharedFuncs.foldLine(line);

    expect(line).to.equal(folded.join(''));
    expect(folded.length).to.equal(1);
  });

  it('Force fold with newline', () => {
    const line = 'abc \\ndef \\nghi';
    const folded = sharedFuncs.foldLine(line);

    expect(line).to.equal(folded.join(''));
    expect(folded).to.deep.equal(['abc \\n', 'def \\n', 'ghi']);
    expect(folded.length).to.equal(3);
  });

  it('Fold at default length', () => {
    const expected = ['Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum pretium ',
      'a nunc ac fringilla. Nulla laoreet tincidunt tincidunt. Proin tristique ',
      'vestibulum mauris non aliquam. Vivamus volutpat odio nisl, sed placerat ',
      'turpis sodales a. Vestibulum quis lectus ac elit sagittis sodales ac a ',
      'felis. Nulla iaculis, nisl ut mattis fringilla, tortor quam tincidunt ',
      'lorem, quis feugiat purus felis ut velit. Donec euismod eros ut leo ',
      'lobortis tristique.'
    ];
    const folded = sharedFuncs.foldLine(expected.join(''));
    expect(folded).to.deep.equal(expected);
    expect(folded.length).to.equal(7);
  });

  it('Force fold white space', () => {
    const line = 'abc def ghi';
    const folded = sharedFuncs.foldLine(line, 5);

    expect(line).to.equal(folded.join(''));
    expect(folded).to.deep.equal(['abc ', 'def ', 'ghi']);
    expect(folded.length).to.equal(3);
  });

  it('Force fold ignoring leading spaces', () => {
    const line = '    abc def ghi';
    const folded = sharedFuncs.foldLine(line, 5);

    expect(line).to.equal(folded.join(''));
    expect(folded).to.deep.equal(['    a', 'bc ', 'def ', 'ghi']);
    expect(folded.length).to.equal(4);
  });

  it('Force fold special character', () => {
    const line = 'abcdef--ghi';
    const folded = sharedFuncs.foldLine(line, 5);

    expect(line).to.equal(folded.join(''));
    expect(folded).to.deep.equal(['abcde', 'f--', 'ghi']);
    expect(folded.length).to.equal(3);
  });

  it('Force fold last special character', () => {
    const line = 'ab--cdef--ghi';
    const folded = sharedFuncs.foldLine(line, 10);

    expect(line).to.equal(folded.join(''));
    expect(folded).to.deep.equal(['ab--cdef--', 'ghi']);
    expect(folded.length).to.equal(2);
  });

  it('Force fold only if at least one non-special character', () => {
    const line = '--abcdefghi';
    const folded = sharedFuncs.foldLine(line, 5);

    expect(line).to.equal(folded.join(''));
    expect(folded).to.deep.equal(['--abc', 'defgh', 'i']);
    expect(folded.length).to.equal(3);
  });
});
