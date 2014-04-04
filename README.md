[![NPM version](https://badge.fury.io/js/markdown.png)](http://badge.fury.io/js/markdown)
[![Build Status](https://secure.travis-ci.org/evilstreak/markdown-js.png)](https://travis-ci.org/evilstreak/markdown-js)
[![Dependency Status](https://gemnasium.com/evilstreak/markdown-js.png)](https://gemnasium.com/evilstreak/markdown-js)

# markdown-js

Yet another Markdown parser, this time for JavaScript. There's a few
options that precede this project but they all treat Markdown to HTML
conversion as a single step process. You pass Markdown in and get HTML
out, end of story. We had some pretty particular views on how the
process should actually look, which include:

  * Producing well-formed HTML. This means that `em` and `strong` nesting
    is important, as is the ability to output as both HTML and XHTML
  * Having an intermediate representation to allow processing of parsed
    data (we in fact have two, both [JsonML]: a markdown tree and an HTML tree)
  * Being easily extensible to add new dialects without having to
    rewrite the entire parsing mechanics
  * Having a good test suite. The only test suites we could find tested
    massive blocks of input, and passing depended on outputting the HTML
    with exactly the same whitespace as the original implementation

[JsonML]: http://jsonml.org/ "JSON Markup Language"

## Installation

Just the `markdown` library:

    npm install markdown

Optionally, install `md2html` into your path

    npm install -g markdown

### In the browser

If you want to use from the browser go to the [releases] page on GitHub and
download the version you want (minified or not).

[releases]: https://github.com/evilstreak/markdown-js/releases

## Usage

### Node

The simple way to use it with Node is:

```js
var markdown = require( "markdown" ).markdown;
console.log( markdown.toHTML( "Hello *World*!" ) );
```

### Browser

It also works in a browser; here is a complete example:

```html
<!DOCTYPE html>
<html>
  <body>
    <textarea id="text-input" oninput="this.editor.update()"
              rows="6" cols="60">Type **Markdown** here.</textarea>
    <div id="preview"> </div>
    <script src="lib/markdown.js"></script>
    <script>
      function Editor(input, preview) {
        this.update = function () {
          preview.innerHTML = markdown.toHTML(input.value);
        };
        input.editor = this;
        this.update();
      }
      var $ = function (id) { return document.getElementById(id); };
      new Editor($("text-input"), $("preview"));
    </script>
  </body>
</html>
```

### Command Line

Assuming you've installed the `md2html` script (see Installation,
above), you can convert Markdown to HTML:

```bash
# read from a file
md2html /path/to/doc.md > /path/to/doc.html

# or from stdin
echo 'Hello *World*!' | md2html
```

### More Options

If you want more control check out the documentation in
[the .js files under src/][src_folder] which details all the methods and parameters
available (including examples!). One day we'll get the docs generated
and hosted somewhere for nicer browsing.

[src_folder]: https://github.com/evilstreak/markdown-js/blob/master/src

Meanwhile, here's an example of using the multi-step processing to
make wiki-style linking work by filling in missing link references:

```js
var md = require( "markdown" ).markdown,
    text = "[Markdown] is a simple text-based [markup language]\n" +
           "created by [John Gruber]\n\n" +
           "[John Gruber]: http://daringfireball.net";

// parse the markdown into a tree and grab the link references
var tree = md.parse( text ),
    refs = tree[ 1 ].references;

// iterate through the tree finding link references
( function find_link_refs( jsonml ) {
  if ( jsonml[ 0 ] === "link_ref" ) {
    var ref = jsonml[ 1 ].ref;

    // if there's no reference, define a wiki link
    if ( !refs[ ref ] ) {
      refs[ ref ] = {
        href: "http://en.wikipedia.org/wiki/" + ref.replace(/\s+/, "_" )
      };
    }
  }
  else if ( Array.isArray( jsonml[ 1 ] ) ) {
    jsonml[ 1 ].forEach( find_link_refs );
  }
  else if ( Array.isArray( jsonml[ 2 ] ) ) {
    jsonml[ 2 ].forEach( find_link_refs );
  }
} )( tree );

// convert the tree into html
var html = md.renderJsonML( md.toHTMLTree( tree ) );
console.log( html );
```

## Intermediate Representation

Internally the process to convert a chunk of Markdown into a chunk of
HTML has three steps:

 1. Parse the Markdown into a JsonML tree. Any references found in the
    parsing are stored in the attribute hash of the root node under the
    key `references`.
 2. Convert the Markdown tree into an HTML tree. Rename any nodes that
    need it (`bulletlist` to `ul` for example) and lookup any references
    used by links or images. Remove the references attribute once done.
 3. Stringify the HTML tree being careful not to wreck whitespace where
    whitespace is important (surrounding inline elements for example).

Each step of this process can be called individually if you need to do
some processing or modification of the data at an intermediate stage.
For example, you may want to grab a list of all URLs linked to in the
document before rendering it to HTML which you could do by recursing
through the HTML tree looking for `a` nodes.

## Building and Testing markdown-js

We use [Grunt](http://gruntjs.com/) to build and run markdown-js's tests.
Make sure you run `npm install` to install the developer dependencies for
the project, then you can:

    $ npm test

To run our test suite. If you'd like to build markdown-js, you can run:

    $ ./node_modules/.bin/grunt all

This command will run all the tests, then output a concatenated markdown.js
and markdown.min.js in the `dist/` directory for use in a browser application.

## Building a custom markdown-js

By default, you will get the [Gruber] and [Maruku] dialects included when you
run `grunt all`. However, you can create a custom build using the following
syntax if you don't want to include Maruku support.

    $ ./node_modules/.bin/grunt "custom:-dialects/maruku"

[Gruber]: http://daringfireball.net/projects/markdown/syntax
[Maruku]: http://maruku.rubyforge.org/maruku.html

## Running Tests

To run the tests under Node you will need tap installed (it's listed as a
`devDependencies` so `npm install` from the checkout should be enough), then do

    $ npm test

## Contributing

Do the usual GitHub fork and pull request dance. Add yourself to the
contributors section of [package.json] too if you want to.

[package.json]: https://github.com/evilstreak/markdown-js/blob/master/package.json

## License

Released under the MIT license.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
