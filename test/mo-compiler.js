var gettextParser = require(".."),
    fs = require("fs");

module.exports["UTF-8"] = {
    setUp: function(callback){
        this.json = JSON.parse(fs.readFileSync(__dirname + "/fixtures/utf8-mo.json", "utf-8"));
        this.mo = fs.readFileSync(__dirname + "/fixtures/utf8.mo");
        callback();
    },
    compile: function(test){
        var compiled = gettextParser.mo.compile(this.json);
        test.deepEqual(Array.prototype.slice.call(compiled), Array.prototype.slice.call(this.mo));
        test.done();
    }
}

module.exports["Latin13"] = {
    setUp: function(callback){
        this.json = JSON.parse(fs.readFileSync(__dirname + "/fixtures/latin13-mo.json", "utf-8"));
        this.mo = fs.readFileSync(__dirname + "/fixtures/latin13.mo");
        callback();
    },
    compile: function(test){
        var compiled = gettextParser.mo.compile(this.json);
        test.deepEqual(Array.prototype.slice.call(compiled), Array.prototype.slice.call(this.mo));
        test.done();
    }
}