var markdown = require("../src/markdown"),
    tap = require("tap");

tap.test("src attribute order", function(t) {
  var tree = markdown.toHTML("![photo](/images/photo.jpg)");
  t.equivalent( tree, '<p><img src="/images/photo.jpg" alt="photo"/></p>' );
  t.end();
});