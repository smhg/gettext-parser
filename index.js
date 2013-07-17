
module.exports = {
	po: {
		parse: require("./lib/poparser"),
		compile: require("./lib/pocompiler")
	},

	mo: {
		parse: require("./lib/moparser"),
		compile: require("./lib/mocompiler")
	}
};