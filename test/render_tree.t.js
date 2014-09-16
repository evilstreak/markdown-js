var markdown = require("../src/markdown"),
    tap = require("tap");

function clone_array( input ) {
  // Helper method. Since the objects are plain round trip through JSON to get
  // a clone
  return JSON.parse( JSON.stringify( input ) );
}

tap.test("undefined attribute", function(t) {
  var tree = markdown.renderJsonML( ['html', ['p', {style: undefined }, 'hello'] ] );
  t.equivalent( tree, '<p>hello</p>' );
  t.end();
});

tap.test("escaped attribute", function(t) {
  var tree = markdown.renderJsonML( ['html', ['p', {style: "color: blue" }, 'hello'] ] );
  t.equivalent( tree, '<p style="color: blue">hello</p>' );
  t.end();
});

tap.test("intermediate trees left alone", function(t) {
  var markdownTree = [ [ "bulletlist", [ "listitem", "foo\nbaz" ], [ "listitem", "bar\nbaz" ] ] ];
  var cloneMarkdownTree = clone_array( markdownTree );
  markdown.toHTMLTree( markdownTree );
  t.equivalent( markdownTree, cloneMarkdownTree, 'toHTMLTree should not mutate its argument' );

  var htmlTree = ['html', ['p', {style: "color: blue" }, 'hello'] ];
  var cloneHtmlTree = clone_array( htmlTree );
  markdown.renderJsonML( htmlTree );
  t.equivalent( htmlTree, cloneHtmlTree, 'renderJsonML should not mutate its argument' );

  t.end();
});
