
  expose.Markdown = Markdown;
  expose.parse = Markdown.parse;
  expose.toHTML = Markdown.toHTML;
  expose.toHTMLTree = Markdown.toHTMLTree;
  expose.renderJsonML = Markdown.renderJsonML;
  expose.DialectHelpers = DialectHelpers;

})(window);

if (typeof define !== 'undefined' && define.amd) {
  // Register as an anonymous module.
  define(function() {
    'use strict';
    return Markdown;
  });
} else {
  window.Markdown = Markdown;
}
