
module.exports.parseHeader = parseHeader;
module.exports.generateHeader = generateHeader;
module.exports.formatCharset = formatCharset;

function parseHeader(str){
	var lines = (str || "").split("\n"),
		headers = {};

	lines.forEach(function(line){
		var parts = line.trim().split(":"),
			key = (parts.shift() || "").trim().toLowerCase(),
			value = parts.join(":").trim();
		if(!key){
			return;
		}
		headers[key] = value;
	});

	return headers;
}

function upperCaseWords(str){
	return (str || "").toLowerCase().trim().replace(/^(MIME|[a-z])|\-[a-z]/gi, function(str){
		return str.toUpperCase();
	});
}

function generateHeader(header){
	var lines = [];

	Object.keys(header || {}).forEach(function(key){
		if(key){
			lines.push(upperCaseWords(key) + ": " + (header[key] || "").trim());
		}
	});

	return lines.join("\n");
}

function formatCharset(charset){
	return (charset || "iso-8859-1").toString().toLowerCase().
            replace(/^utf[\-_]?(\d+)$/, "utf-$1").
            replace(/^win(?:dows)?[\-_]?(\d+)$/, "windows-$1").
            replace(/^latin[\-_]?(\d+)$/, "iso-8859-$1").
            replace(/^(us[\-_]?)?ascii$/, "ascii").
            trim();
}