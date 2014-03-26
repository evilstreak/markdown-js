if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}
define(['../lib/markdown', '../src/landmark'], function(markdown, Landmark) {
  var util = require('util');
  var count = 1;

  function debug(obj) {
    console.log('====[ ' + count + ' ]=================================');
    console.log(util.inspect(obj, false, null));
    console.log('------------------------------------------\n');
    count++;
  }

  // debug(markdown.toHTMLTree("**I am strong**", Landmark));
  // debug(markdown.toHTMLTree("*I am emphasized*", Landmark));
  // debug(markdown.toHTMLTree("//I am italics//", Landmark));
  // debug(markdown.toHTMLTree("~~I am striked through~~", Landmark));
  // debug(markdown.toHTMLTree("//~~I am striked through and italics~~//", Landmark));
  // debug(markdown.toHTMLTree("### Header 1\nParagraph\n", Landmark));
  debug(markdown.toHTMLTree("\n\n========================\n\n", Landmark));
  debug(markdown.toHTMLTree("There's a code block in here:", Landmark));
});