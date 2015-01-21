'use strict';

var chai = require('chai');
var gettextParser = require('..');
var fs = require('fs');

var expect = chai.expect;
chai.Assertion.includeStack = true;

describe('PO Parser', function() {

    describe('UTF-8', function() {
        it('should parse', function() {
            var po = fs.readFileSync(__dirname + '/fixtures/utf8.po');
            var json = JSON.parse(fs.readFileSync(__dirname + '/fixtures/utf8-po.json', 'utf-8'));
            var parsed = gettextParser.po.parse(po);
            expect(parsed).to.deep.equal(json);
        });
    });

    describe('UTF-8 as a string', function() {
        it('should parse', function() {
            var po = fs.readFileSync(__dirname + '/fixtures/utf8.po', 'utf-8');
            var json = JSON.parse(fs.readFileSync(__dirname + '/fixtures/utf8-po.json', 'utf-8'));
            var parsed = gettextParser.po.parse(po);
            expect(parsed).to.deep.equal(json);
        });
    });

    describe('Latin-13', function() {
        it('should parse', function() {
            var po = fs.readFileSync(__dirname + '/fixtures/latin13.po');
            var json = JSON.parse(fs.readFileSync(__dirname + '/fixtures/latin13-po.json', 'utf-8'));
            var parsed = gettextParser.po.parse(po);
            expect(parsed).to.deep.equal(json);
        });
    });
    
    describe('Stream handler', function(){
        it('should parse', function(done){
          this.timeout(0); // disable timeout on this one
          
          var poStream = fs.createReadStream(__dirname + '/fixtures/hugeUtf8.po');
          var json = JSON.parse(fs.readFileSync(__dirname + '/fixtures/hugeUtf8-po.json', 'utf-8'));
          poStream.pipe(gettextParser.po.parse.stream('utf-8')).on('data', function(parsed){
            expect(parsed).to.deep.equal(json);
            var fd = fs.openSync('translation.json', 'w');
            fs.writeSync(fd, JSON.stringify(parsed));
            done();
          }).on('error', function(error){
            console.log('error');
            done(error);
          });
        });
    });

});