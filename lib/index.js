// super simple module for the most common node.js use case.
exports.markdown = require("./markdown");
exports.parse = exports.markdown.toHTML;
