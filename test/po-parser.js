var gettextParser = require(".."),
    fs = require("fs");

module.exports["UTF-8"] = {
    setUp: function(callback){
        this.po = fs.readFileSync(__dirname + "/fixtures/utf8.po");
        this.json = JSON.parse(fs.readFileSync(__dirname + "/fixtures/utf8-po.json", "utf-8"));
        callback();
    },

    parse: function(test){
        var parsed = gettextParser.po.parse(this.po);
        test.deepEqual(parsed, this.json);
        test.done();
    }
}

module.exports["UTF-8 as string"] = {
    setUp: function(callback){
        this.po = fs.readFileSync(__dirname + "/fixtures/utf8.po", 'utf-8');
        this.json = JSON.parse(fs.readFileSync(__dirname + "/fixtures/utf8-po.json", "utf-8"));
        callback();
    },

    parse: function(test){
        var parsed = gettextParser.po.parse(this.po);
        test.deepEqual(parsed, this.json);
        test.done();
    }
}

module.exports["Latin13"] = {
    setUp: function(callback){
        this.po = fs.readFileSync(__dirname + "/fixtures/latin13.po");
        this.json = JSON.parse(fs.readFileSync(__dirname + "/fixtures/latin13-po.json", "utf-8"));
        callback();
    },

    parse: function(test){
        var parsed = gettextParser.po.parse(this.po);
        test.deepEqual(parsed, this.json);
        test.done();
    }
}