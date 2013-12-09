
  expose.Markdown = Markdown;
  expose.parse = Markdown.parse;
  expose.toHTML = Markdown.toHTML;
  expose.toHTMLTree = Markdown.toHTMLTree;
  expose.renderJsonML = Markdown.renderJsonML;
  expose.DialectHelpers = DialectHelpers;

})(function() {
  window.markdown = {};
  return window.markdown;
}());
