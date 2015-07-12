var markdown = require("../src/markdown"),
    tap = require("tap");

tap.test("src attribute order", function(t) {
  var tree = markdown.toHTML("![photo](/images/photo.jpg)");
  t.equivalent( tree, '<p><img src="/images/photo.jpg" alt="photo"/></p>' );
  t.end();
});

tap.test("standalone", function(t) {
  var tree = markdown.toHTML("", "Gruber", {"standalone": true});
  t.equivalent( tree, "<!doctype html><head>\n\n</head><body>\n\n</body>" );
  t.end();
});

tap.test("standalone plus utf8", function(t) {
  var tree = markdown.toHTML("", "Gruber", {"standalone": true, "htmlencoding": "utf8"});
  t.equivalent( tree, "<!doctype html><head>\n\n<meta charset='utf-8'/>\n\n</head><body>\n\n</body>" );

  var tree2 = markdown.toHTML("# test", "Gruber", {"standalone": true, "htmlencoding": "utf8"});
  t.equivalent( tree2, "<!doctype html><head>\n\n<meta charset='utf-8'/>\n\n</head><body>\n\n<h1>test</h1>\n\n</body>" );

  t.end();
});
