var sharedFuncs = require("../lib/shared");

module.exports["Folding tests"] = {

    "Short line, no folding": function(test){
        var line = "abc def ghi";
        var folded = sharedFuncs.foldLine(line);

        test.equal(line, folded.join(""));
        test.ok(folded.length == 1);
        test.done();
    },

    "Short line, force fold with newline": function(test){
        var line = "abc \\ndef \\nghi";
        var folded = sharedFuncs.foldLine(line);

        test.equal(line, folded.join(""));
        test.deepEqual(folded, ["abc \\n", "def \\n", "ghi"]);
        test.done();
    },

    "Long line": function(test){
        var expected = [ 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum pretium ',
                         'a nunc ac fringilla. Nulla laoreet tincidunt tincidunt. Proin tristique ',
                         'vestibulum mauris non aliquam. Vivamus volutpat odio nisl, sed placerat ',
                         'turpis sodales a. Vestibulum quis lectus ac elit sagittis sodales ac a ',
                         'felis. Nulla iaculis, nisl ut mattis fringilla, tortor quam tincidunt ',
                         'lorem, quis feugiat purus felis ut velit. Donec euismod eros ut leo ',
                         'lobortis tristique.' ],
        folded = sharedFuncs.foldLine(expected.join(""));
        test.deepEqual(folded, expected);
        test.done();
    }

}