var markdown = require("../src/markdown"),
    tap = require("tap");

tap.test("src attribute order", function(t) {
  var tree = markdown.toHTML("![photo](/images/photo.jpg)");
  t.equivalent( tree, '<p><img src="/images/photo.jpg" alt="photo"/></p>' );
  t.end();
});

tap.test("HTML Sanitizing", function(t) {
	var input = "hello <world>";

  t.equivalent( markdown.toHTML(input, 'Gruber'),
                '<p>hello &lt;world&gt;</p>',
                "escapes by default" );

  t.equivalent( markdown.toHTML(input, 'Gruber', {sanitize: false}),
                '<p>hello <world></p>',
                "sanitization can be disabled" );

  t.end();
});
