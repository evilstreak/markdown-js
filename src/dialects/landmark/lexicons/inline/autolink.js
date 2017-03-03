if (typeof define !== 'function') {
	var define = require('amdefine')(module);
}
define(['../../helpers'], function(LandmarkHelpers) {

	var ed2kLinkLexicon = {
		start: "ed2k",
		pattern: /^(ed2k:(?:\/{1,3})\|file\|(?:.+?)\|\/(?!\|))/gm,

		emitter: function(text, match, prev) {
			var matches = text.match(ed2kLinkLexicon.pattern);

			if (matches) {
				var url = matches[0],
					display = url;

				if (url.match(/\]\[\d$/)) {
					return;
				}

				if (url.match(/\(ed2k/)) {
					return;
				}

				return [display.length, ["a", {
						"href": url,
						"class": "p2p-link ed2k"
					},
					display
				]];
			}
			return;
		}
	};

	var thunderLinkLexicon = {
		start: "thunder",
		pattern: /^(thunder:(?:\/{1,3})[A-Za-z0-9\+\/=]*)/gm,

		emitter: function(text, match, prev) {
			var matches = text.match(thunderLinkLexicon.pattern);

			if (matches) {
				var url = matches[0],
					display = url;

				if (url.match(/\]\[\d$/)) {
					return;
				}

				if (url.match(/\(thunder/)) {
					return;
				}

				return [display.length, ["a", {
						"href": url,
						"class": "p2p-link thunder"
					},
					display
				]];
			}
			return;
		}
	};

	var magnetLinkLexicon = {
		start: "magnet",
		pattern: /^(magnet:\?(?:[^\s()<>]+|\([^\s()<>]+\))+(?:\([^\s()<>]+\)|[^`!()\[\]{};:'".,<>?«»“”‘’\s]))/gm,

		emitter: function(text, match, prev) {
			var matches = text.match(magnetLinkLexicon.pattern);

			if (matches) {
				var url = matches[0],
					display = url;

				if (url.match(/\]\[\d$/)) {
					return;
				}

				if (url.match(/\(magnet/)) {
					return;
				}

				return [display.length, ["a", {
						"href": url,
						"class": "p2p-link magnet"
					},
					display
				]];
			}
			return;
		}
	};

	var bareLinkLexicon = {
		start: ["http", "ftp", "www"],
		//pattern: /^((?:https?|ftps?):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?/igm.source,
		pattern: /^((?:(?:https?|ftps?):(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.])(?:[^\s()<>]+|\([^\s()<>]+\))+(?:\([^\s()<>]+\)|[^`!()\[\]{};:'".,<>?«»“”‘’\s]))/gm,

		emitter: function(text, match, prev) {
			var matches = text.match(bareLinkLexicon.pattern);

			if (matches) {
				var url = matches[0],
					display = url;

				if (url.match(/\]\[\d$/)) {
					return;
				}

				if (url.match(/\(http/)) {
					return;
				}

				if (url.match(/^www/)) {
					url = "http://" + url;
				}
				return [display.length, ["a", {
						href: url
					},
					display
				]];
			}
			return;
		}
	};

	var enclosedLinkLexicon = {
		start: "{",
		pattern: /^((?:https?|ftps?):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?/igm,

		emitter: function(text, match, prev) {
			var matches = text.match(enclosedLinkLexicon.pattern);

			if (matches) {
				var url = matches[0],
					display = url;
			}
			return;
		}
	};

	var InlineAutoLinkLexicons = {
		lexicons: [
			bareLinkLexicon
			// magnetLinkLexicon,
			// thunderLinkLexicon,
			// ed2kLinkLexicon
		],

		register: function(dialect) {
			var lexicons = this.lexicons;
			for (var i in lexicons) {
				var lexicon = lexicons[i];
				lexicon.dialect = dialect;
				dialect.inline[lexicon.start] = lexicon.emitter;
			}
		}
	};

	module.exports = InlineAutoLinkLexicons;
});