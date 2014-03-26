if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(['../../helpers'], function(LandmarkHelpers) {

	var highlightLexicon = {
		between: "*",
		wordBoundary: true,
		emitter: function(contents) {
			if (contents.toString() === "")
				return;
			return ['em'].concat(contents);
		}
	};
	var strongLexicon = {
		between: "**",
		wordBoundary: true,
		emitter: function(contents) {
			if (contents.toString() === "")
				return;
			return ['strong'].concat(contents);
		}
	};
	var strongHighlightLexicon = {
		between: "***",
		wordBoundary: true,
		emitter: function(contents) {
			if (contents.toString() === "")
				return;
			return ['strong', ['em'].concat(contents)];
		}
	};
	var italicsLexicon = {
		between: '//',
		wordBoundary: true,
		emitter: function(contents) {
			if (contents.toString() === "")
				return;
			return ['i'].concat(contents);
		}
	};
	var insLexicon = {
		between: '__',
		wordBoundary: true,
		emitter: function(contents) {
			if (contents.toString() === "")
				return;
			return ['ins'].concat(contents);
		}
	};
	var delLexicon = {
		between: '~~',
		wordBoundary: true,
		emitter: function(contents) {
			if (contents.toString() === "")
				return;
			return ['del'].concat(contents);
		}
	};

	var InlineEmphasisLexicon = {
		alias: "inline_emphasis",
		lexicons: [
			strongHighlightLexicon,
			strongLexicon,
			highlightLexicon,
			italicsLexicon,
			insLexicon,
			delLexicon
		],

		register: function(dialect) {
			var lexicons = this.lexicons;
			for (var name in this.lexicons) {
				var lexicon = this.lexicons[name];
				lexicon.dialect = dialect;
				dialect.inlineBetween({
					between: lexicon.between,
					wordBoundary: lexicon.wordBoundary,
					emitter: lexicon.emitter
				});
			}
		}
	};

	return InlineEmphasisLexicon;
});