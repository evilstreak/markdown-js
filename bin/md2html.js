#!/usr/bin/env node
(function () {
  "use strict";

  var fs = require("fs"),
    markdown = require("markdown").markdown,
    nopt = require("nopt"),
    stream,
    opts,
    buffer = "";

  opts = nopt(
    { "dialect": [ "Gruber", "Maruku"],
      "standalone": Boolean,
      "htmlencoding" : [ "none", "utf8"],
      "help": Boolean
    }
  );

  if (opts.help || process.argv.length === 2) {
    var name = process.argv[1].split("/").pop();
    console.warn( require("util").format(
      "usage: %s [--dialect=DIALECT --htmlencoding=ENCODING] FILE"
      + "\n\nValid dialects are Gruber (the default) or Maruku"
      + "\nIf you choose stand-alone, it will be a valid xhtml document"
      + "\nValid html-encodings are none (the default) or utf8",
      name
    ) );
    process.exit(0);
  }

  var fullpath = opts.argv.remain[0];

  if (fullpath && fullpath !== "-")
    stream = fs.createReadStream(fullpath);
  else
    stream = process.stdin;
  stream.resume();
  stream.setEncoding("utf8");

  stream.on("error", function(error) {
    console.error(error.toString());
    process.exit(1);
  });

  stream.on("data", function(data) {
    buffer += data;
  });

  stream.on("end", function() {
    var html = markdown.toHTML(
      buffer, 
      opts.dialect, 
      {
        'htmlencoding' : opts.htmlencoding,
        'standalone' : opts.standalone
      }
    );
    console.log(html);
  });

}());
