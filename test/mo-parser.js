var gettextParser = require(".."),
    fs = require("fs");

module.exports["UTF-8"] = {
    setUp: function(callback){
        this.mo = fs.readFileSync(__dirname + "/fixtures/utf8.mo");
        this.json = JSON.parse(fs.readFileSync(__dirname + "/fixtures/utf8-mo.json", "utf-8"));
        callback();
    },

    parse: function(test){
        var parsed = gettextParser.mo.parse(this.mo);
        test.deepEqual(parsed, this.json);
        test.done();
    }
}

module.exports["Latin13"] = {
    setUp: function(callback){
        this.mo = fs.readFileSync(__dirname + "/fixtures/latin13.mo");
        this.json = JSON.parse(fs.readFileSync(__dirname + "/fixtures/latin13-mo.json", "utf-8"));
        callback();
    },

    parse: function(test){
        var parsed = gettextParser.mo.parse(this.mo);
        test.deepEqual(parsed, this.json);
        test.done();
    }
}