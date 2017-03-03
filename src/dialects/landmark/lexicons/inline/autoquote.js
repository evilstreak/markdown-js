/**
  If a line contains a single quote, convert it to a blockquote. For example:

  "My fake plants died because I did not pretend to water them."

  Would be:

  <blockquote>My fake plants died because I did not pretend to water them.</blockquote>

**/
if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}
define(['../../helpers'], function(LandmarkHelpers) {

  var InlineAutoQuoteLexicon = {
    start: '"',

    emitter: function(text, match, prev) {
      if (prev) {
        var last = prev[prev.length - 1];
        if (typeof last === "string") {
          return;
        }
      }

      if (text.length > 2 && text.charAt(0) === '"' && text.charAt(text.length - 1) === '"') {
        var inner = text.substr(1, text.length - 2);
        if (inner.indexOf('"') === -1 && inner.indexOf("\n") === -1) {
          return [text.length, ['blockquote', inner]];
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

  module.exports = InlineAutoQuoteLexicon;
});