
// Expose to the world
module.exports.parseHeader = parseHeader;
module.exports.generateHeader = generateHeader;
module.exports.formatCharset = formatCharset;

/**
 * Parses a header string into an object of key-value pairs
 *
 * @param {String} str Header string
 * @return {Object} An object of key-value pairs
 */
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

/**
 * Convert first letters after - to uppercase, other lowercase
 * 
 * @param {String} str String to be updated
 * @return {String} A string with uppercase words
 */
function upperCaseWords(str){
	return (str || "").toLowerCase().trim().replace(/^(MIME|[a-z])|\-[a-z]/gi, function(str){
		return str.toUpperCase();
	});
}

/**
 * Joins a header object of key value pairs into a header string
 *
 * @param {Object} header Object of key value pairs
 * @return {String} Header string
 */
function generateHeader(header){
	var lines = [];

	Object.keys(header || {}).forEach(function(key){
		if(key){
			lines.push(upperCaseWords(key) + ": " + (header[key] || "").trim());
		}
	});

	return lines.join("\n");
}

/**
 * Normalizes charset name. Converts utf8 to utf-8, WIN1257 to windows-1257 etc.
 *
 * @param {String} charset Charset name
 * @return {String} Normalized charset name
 */
function formatCharset(charset){
	return (charset || "iso-8859-1").toString().toLowerCase().
            replace(/^utf[\-_]?(\d+)$/, "utf-$1").
            replace(/^win(?:dows)?[\-_]?(\d+)$/, "windows-$1").
            replace(/^latin[\-_]?(\d+)$/, "iso-8859-$1").
            replace(/^(us[\-_]?)?ascii$/, "ascii").
            trim();
}