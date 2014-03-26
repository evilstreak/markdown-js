/**
  Supports Discourse's custom @mention syntax for calling out a user in a post.
  It will add a special class to them, and create a link if the user is found in a
  local map.
**/
if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}
define(['../../helpers'], function(LandmarkHelpers) {

  var InlineMentionLexicon = {
    start: '@',
    pattern: /^(@[a-zA-Z0-9\u4e00-\u9fa5][_.\-a-zA-Z0-9\u4e00-\u9fa5]{1,19})/m,
    wordBoundary: true,

    emitter: function(text, match, prev) {
      var matches = text.match(InlineMentionLexicon.pattern);

      if (matches) {
        var username = matches[1],
            mentionLookup = this.dialect.options.mentionLookup;

        if (mentionLookup) {
          var users = mentionLookup(username.substr(1));
          if (users) {
            return [username.length, ["a",
              {'class': 'mention', href: users[0].permlink},
              username
            ]];
          } else {
            return [text.length, ["span", {"class": "mention not-found"}, text]];
          }
        }
      }
      return;
    },

    register: function(dialect) {
      var lexicon = this;
      lexicon.dialect = dialect;
      dialect.inline[lexicon.start] = function(text) {
        return lexicon.emitter(text);
      };
    }
  };

  module.exports = InlineMentionLexicon;
});

