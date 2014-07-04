var markdown = require("../src/markdown"),
    tap = require("tap");

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
