var gettextParser = require(".."),
    fs = require("fs");

module.exports["UTF-8"] = {
    setUp: function(callback){
        this.json = JSON.parse(fs.readFileSync(__dirname + "/fixtures/utf8-po.json", "utf-8"));
        this.po = fs.readFileSync(__dirname + "/fixtures/utf8.po", "utf-8");
        callback();
    },
    compile: function(test){
        var compiled = gettextParser.po.compile(this.json);
        test.equal(compiled, this.po)
        test.done();
    }
}

module.exports["Latin13"] = {
    setUp: function(callback){
        this.json = JSON.parse(fs.readFileSync(__dirname + "/fixtures/latin13-po.json", "utf-8"));
        this.po = fs.readFileSync(__dirname + "/fixtures/latin13.po");
        callback();
    },
    compile: function(test){
        var compiled = gettextParser.po.compile(this.json);
        test.deepEqual(Array.prototype.slice.call(compiled), Array.prototype.slice.call(this.po));
        test.done();
    }
}