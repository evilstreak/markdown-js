if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(['../../helpers'], function(LandmarkHelpers) {
	var BlockHeaderLexicon = {
		name: "atxHeader",
		emitter: function(block, next) {
			var m = block.match(/^(#{1,6})\s(.*?)\s*#*\s*(?:\n|$)/);

			if (!m)
				return;

			var header = ["header", {
				level: m[1].length
			}];
			Array.prototype.push.apply(header, this.processInline(m[2]));

			if (m[0].length < block.length)
				next.unshift(LandmarkHelpers.mk_block(block.substr(m[0].length), block.trailing, block.lineNumber + 2));

			return [header];
		},

		register: function(dialect) {
			var lexicon = this;
			lexicon.dialect = dialect;
			dialect.registerBlock(lexicon.name, lexicon.emitter);
		}
	};

	module.exports = BlockHeaderLexicon;
});