if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}
define(['../../helpers'], function(LandmarkHelpers) {
  var BlockParagraphLexicon = {
    name: "para",
    alias: "paragraph",
    emitter: function(block, next) {
      return [["para"].concat(this.processInline(block))];
    },

    register: function(dialect) {
      var lexicon = this;
      lexicon.dialect = dialect;
      dialect.registerBlock(lexicon.name, lexicon.emitter);
    }
  };

  return BlockParagraphLexicon;
});