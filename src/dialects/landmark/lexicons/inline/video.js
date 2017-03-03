if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(['../../helpers'], function(LandmarkHelpers) {
	var InlineVideoLexicon = {
		start: "@(",
		stop: ")",
		wordBoundary: true,
		rawContents: true,

		emitter: function(contents) {
			var videoLookup = this.dialect.options.videoLookup;
			if (videoLookup) {
				var video = videoLookup(contents);
				if (video) {
					return [video.title.length, ["video", video.attrs]];
				} else {
					return [contents.length + 3, ["span", {
							"class": "video not-found"
						},
						InlineVideoLexicon.start + contents + InlineVideoLexicon.stop
					]];
				}
			}
		},

		register: function(dialect) {
			var lexicon = this;
			lexicon.dialect = dialect;
			dialect.inlineBetween({
				start: lexicon.start,
				stop: lexicon.stop,
				rawContents: lexicon.rawContents,
				wordBoundary: lexicon.wordBoundary,
				emitter: lexicon.emitter
			});
		}
	};

	module.exports = InlineVideoLexicon;
});