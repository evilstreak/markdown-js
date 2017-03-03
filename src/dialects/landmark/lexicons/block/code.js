if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(['../../helpers'], function(LandmarkHelpers) {
	var DEFAULT_CODE_ACCEPTABLE_LANGUAGES =
		["lang-auto", "1c", "actionscript", "apache", "applescript", "avrasm", "axapta", "bash", "brainfuck",
		"clojure", "cmake", "coffeescript", "cpp", "cs", "css", "d", "delphi", "diff", "xml", "django", "dos",
		"erlang-repl", "erlang", "glsl", "go", "handlebars", "haskell", "http", "ini", "java", "javascript",
		"json", "lisp", "lua", "markdown", "matlab", "mel", "nginx", "objectivec", "parser3", "perl", "php",
		"profile", "python", "r", "rib", "rsl", "ruby", "rust", "scala", "smalltalk", "sql", "tex", "text",
		"vala", "vbscript", "vhdl"
	];

	var BlockCodeLexicon = {
		alias: 'code',
		name: "code",
		start: /^\s*`{3}([^\n\[\]]+)?\n?([\s\S]*)?/gm,
		stop: '```',
		rawContents: true,

		emitter: function(blockContents, matches) {

			var klass = this.dialect.options.code_default_language;
			var acceptableCodeClasses = this.dialect.options.code_languages ? this.dialect.options.code_languages : DEFAULT_CODE_ACCEPTABLE_LANGUAGES;

			if (matches[1] && acceptableCodeClasses.indexOf(matches[1]) !== -1) {
				klass = matches[1];
			}

			var attrs = klass ? {"class": klass} : {};

			// for (var i in blockContents) {
			//	blockContents[i] = blockContents[i].trim();
			// }

			return ['pre', ['code', attrs,
				blockContents.join(["\n"]).trim()
			]];
		},

		register: function(dialect) {
			var lexicon = this;
			lexicon.dialect = dialect;
			dialect.replaceBlock({
				name: lexicon.name,
				start: lexicon.start,
				stop: lexicon.stop,
				rawContents: lexicon.rawContents,
				wordBoundary: lexicon.wordBoundary,
				emitter: lexicon.emitter,
				dialect: lexicon.dialect
			});
		}
	};

	module.exports = BlockCodeLexicon;
});