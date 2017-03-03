if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(['../../helpers'], function(LandmarkHelpers) {
	var BlockQuoteLexicon = {
		alias: "blockquote",
		name: "blockquote",

		emitter: function(block, next) {
			// Handle quotes that have spaces before them
			var m = /(^|\n) +(\>[\s\S]*)/.exec(block);

			if (m && m[2] && m[2].length) {
				var blockContents = block.replace(/(^|\n) +\>/, "$1>");
				next.unshift(blockContents);
				return [];
			}

			if (!block.match(/^>/m))
				return undefined;

			var jsonml = [];

			// separate out the leading abutting block, if any. I.e. in this case:
			//
			//  a
			//  > b
			//
			if (block[0] !== ">") {
				var lines = block.split(/\n/),
					prev = [],
					line_no = block.lineNumber;

				// keep shifting lines until you find a crotchet
				while (lines.length && lines[0][0] !== ">") {
					prev.push(lines.shift());
					line_no++;
				}

				var abutting = LandmarkHelpers.mk_block(prev.join("\n"), "\n", block.lineNumber);
				jsonml.push.apply(jsonml, this.processBlock(abutting, []));
				// reassemble new block of just block quotes!
				block = LandmarkHelpers.mk_block(lines.join("\n"), block.trailing, line_no);
			}


			// if the next block is also a blockquote merge it in
			while (next.length && next[0][0] === ">") {
				var b = next.shift();
				block = LandmarkHelpers.mk_block(block + block.trailing + b, b.trailing, block.lineNumber);
			}

			// Strip off the leading "> " and re-process as a block.
			var input = block.replace(/^> ?/gm, ""),
				old_tree = this.tree,
				processedBlock = this.toTree(input, ["blockquote"]),
				attr = LandmarkHelpers.extract_attr(processedBlock);

			// If any link references were found get rid of them
			if (attr && attr.references) {
				delete attr.references;
				// And then remove the attribute object if it's empty
				if (LandmarkHelpers.isEmpty(attr))
					processedBlock.splice(1, 1);
			}

			jsonml.push(processedBlock);
			return jsonml;
		},

		register: function(dialect) {
			var lexicon = this;
			lexicon.dialect = dialect;
			dialect.registerBlock(lexicon.name, lexicon.emitter);
		}
	};

	return BlockQuoteLexicon;
});