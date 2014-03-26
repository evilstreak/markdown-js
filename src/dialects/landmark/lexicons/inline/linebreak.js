if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}
define(['../../helpers'], function(LandmarkHelpers) {
  var InlineLineBreakLexicon = {
    alias: 'linebreak',
    start: '\n',

    emitter: function(text, match, prev) {
      return [1, ["linebreak"]];
    },

    register: function(dialect) {
      var lexicon = this;
      lexicon.dialect = dialect;
      dialect.inline[lexicon.start] = function(text) {
        return lexicon.emitter(text);
      };
    }
  };

  return InlineLineBreakLexicon;
});