if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}
define(['../../helpers'], function(LandmarkHelpers) {

  var InlineEmojiLexicon = {
    start: '[',
    stop: ']',
    wordBoundary: true,
    rawContents: true,

    emitter: function(contents) {
      var emojiLookup = this.dialect.options.emojiLookup;
      if (emojiLookup) {
        var emoji = emojiLookup(contents);
        if (emoji) {
          return ["img", emoji.attrs];
        } else {
          return ["span", {"class": "emoji not-found"}, InlineEmojiLexicon.start + contents + InlineEmojiLexicon.stop];
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

  module.exports = InlineEmojiLexicon;
});