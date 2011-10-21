#!/usr/bin/env node
(function () {
  "use strict";

  var fs = require('fs')
    , markdown = require('markdown').markdown
    , fullpath = process.argv[2]
    ;

  function convert(err, data) {
    var md
      , html
      ;

    if (err) {
      throw err;
    }

    md = data.toString('utf8');
    html = markdown.toHTML(md);
    console.log(html);
  }

  if (!fullpath) {
    console.error('try: ', process.argv[1].split('/').pop(), '/path/to/doc.md');
    return;
  }

  fs.readFile(fullpath, convert);
}())
