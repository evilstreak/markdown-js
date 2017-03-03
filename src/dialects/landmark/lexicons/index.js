if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}
define([
  './block/header',
  './block/code',
  './block/horizontal_rule',
  './block/blockquote',
  './block/paragraph',

  './inline/autoquote',
  './inline/autolink',
  './inline/linebreak',
  './inline/emphasis',
  './inline/keystroke',
  './inline/emoji',
  './inline/mention'
], function(
  BlockHeaderLexicon,
  BlockCodeLexicon,
  BlockHorizontalRuleLexicon,
  BlockQuoteLexicon,
  BlockParagraphLexicon,

  InlineAutoQuoteLexicon,
  InlineAutoLinkLexicons,
  InlineLineBreakLexicon,
  InlineEmphasisLexicon,
  InlineKeyStrokeLexicon,
  InlineEmojiLexicon,
  InlineMentionLexicon
) {
  var Lexicons = [
    BlockHeaderLexicon,
    BlockCodeLexicon,
    BlockHorizontalRuleLexicon,
    BlockQuoteLexicon,
    BlockParagraphLexicon,

    InlineAutoQuoteLexicon,
    InlineAutoLinkLexicons,
    InlineLineBreakLexicon,
    InlineEmphasisLexicon,
    InlineKeyStrokeLexicon,
    InlineEmojiLexicon,
    InlineMentionLexicon
  ];

  return Lexicons;
});