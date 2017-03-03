if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(['../../helpers'], function(LandmarkHelpers) {
	var BlockHorizontalRuleLexicon = {
		alias: 'horizRule',
		name: "horizRule",
		// pattern: /^(?:([\s\S]*?)\n)?[ \t]*([-~#*_=]{5,})[ \t]*(?:\n([\s\S]*))?$/,
		pattern: /^(?:([\s\S]*?)\n)?[ \t]*([-=]{5,})[ \t]*(?:\n([\s\S]*))?$/,

		emitter: function(block, next) {
			// this needs to find any hr in the block to handle abutting blocks
			var m = block.match(BlockHorizontalRuleLexicon.pattern);
			var attrs = {};

			if (!m)
				return undefined;

			/* TODO: Add style class?
			switch(m[2]) {
			case "-":
				attrs = {"class": "dash"};
				break;
			case "_":
				attrs = {"class": "underline"};
				break;
			case "*":
				attrs = {"class": "asterisk"};
				break;
			case "=":
				attrs = {"class": "dash"};
				break;
			}*/

			var jsonml = [
				["hr", attrs]
			];

			// if there's a leading abutting block, process it
			if (m[1]) {
				var contained = LandmarkHelpers.mk_block(m[1], "", block.lineNumber);
				jsonml.unshift.apply(jsonml, this.toTree(contained, []));
			}

			// if there's a trailing abutting block, stick it into next
			if (m[3])
				next.unshift(LandmarkHelpers.mk_block(m[3], block.trailing, block.lineNumber + 1));

			return jsonml;
		},

		register: function(dialect) {
			var lexicon = this;
			lexicon.dialect = dialect;
			dialect.registerBlock(lexicon.name, lexicon.emitter);
		}
	};

	module.exports = BlockHorizontalRuleLexicon;
});