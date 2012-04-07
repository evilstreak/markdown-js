#!/usr/bin/env node
(function () {
  "use strict";

  var fs = require('fs')
    , markdown = require('markdown').markdown
    , fullpath = process.argv[2]
    , stream
    , buffer = ""
    ;

  if (fullpath == '--help') {
    console.warn('usage:', process.argv[1].split('/').pop(), '/path/to/doc.md');
    process.exit();
  }

  if (fullpath) {
    stream = fs.createReadStream(fullpath);
  } else {
    stream = process.stdin;
  }
  stream.resume();
  stream.setEncoding('utf8');

  stream.on('error', function(error) {
    console.error(error.toString());
    process.exit(1);
  });

  stream.on('data', function(data) {
    buffer += data;
  });

  stream.on('end', function() {
    var html = markdown.toHTML(buffer);
    console.log(html);
  });

}())
