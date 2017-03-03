/**
  Landmark.DialectHelper class
  Stolen from https://github.com/discourse/discourse/blob/master/vendor/assets/javascripts/better_markdown.js
*/

// Released under MIT license
// Copyright (c) 2009-2010 Dominic Baggott
// Copyright (c) 2009-2010 Ash Berlin
// Copyright (c) 2011 Christoph Dorn <christoph@christophdorn.com> (http://www.christophdorn.com)

/*jshint browser:true, devel:true */
if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}
define([], function(w) {
  var _ = require("lodash");

  // For Spidermonkey based engines
  function mk_block_toSource() {
    return "Markdown.mk_block( " +
      uneval(this.toString()) +
      ", " +
      uneval(this.trailing) +
      ", " +
      uneval(this.lineNumber) +
      " )";
  }

  // node
  function mk_block_inspect() {
    var util = require("util");
    return "Markdown.mk_block( " +
      util.inspect(this.toString()) +
      ", " +
      util.inspect(this.trailing) +
      ", " +
      util.inspect(this.lineNumber) +
      " )";

  }

  var LandmarkHelpers = {

    mk_block: function(block, trail, line) {
      // Be helpful for default case in tests.
      if (arguments.length === 1)
        trail = "\n\n";

      // We actually need a String object, not a string primitive
      /* jshint -W053 */
      var s = new String(block);
      s.trailing = trail;
      // To make it clear its not just a string
      s.inspect = mk_block_inspect;
      s.toSource = mk_block_toSource;

      if (line !== undefined)
        s.lineNumber = line;

      return s;
    },

    isEmpty: function(obj) {
      for (var key in obj) {
        if (hasOwnProperty.call(obj, key))
          return false;
      }
      return true;
    },

    extract_attr: function(jsonml) {
      return this.isArray(jsonml) && jsonml.length > 1 && typeof jsonml[1] === "object" && !(this.isArray(jsonml[1])) ? jsonml[1] : undefined;
    },

    // A helper function to create attributes
    create_attrs: function() {
      if (!this.extract_attr(this.tree)) {
        this.tree.splice(1, 0, {});
      }

      var attrs = this.extract_attr(this.tree);

      // make a references hash if it doesn't exist
      if (attrs.references === undefined) {
        attrs.references = {};
      }

      return attrs;
    },

    // Create references for attributes
    create_reference: function(attrs, m) {
      if (m[2] && m[2][0] === "<" && m[2][m[2].length - 1] === ">")
        m[2] = m[2].substring(1, m[2].length - 1);

      var ref = attrs.references[m[1].toLowerCase()] = {
        href: m[2]
      };

      if (m[4] !== undefined)
        ref.title = m[4];
      else if (m[5] !== undefined)
        ref.title = m[5];
    },

    /**
      Returns true if there's an invalid word boundary for a match.

      @method invalidBoundary
      @param {Object} args our arguments, including whether we care about boundaries
      @param {Array} prev the previous content, if exists
      @returns {Boolean} whether there is an invalid word boundary
    **/
    invalidBoundary: function(args, prev) {

      if (!args.wordBoundary && !args.spaceBoundary) { return; }

      var last = prev[prev.length - 1];
      if (typeof last !== "string") { return; }

      if (args.wordBoundary && (last.match(/(\w|\/)$/))) { return true; }
      if (args.spaceBoundary && (!last.match(/\s$/))) { return true; }
    }
  };

  LandmarkHelpers.isArray = Array.isArray || function(obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
  };

  // Don't mess with Array.prototype. Its not friendly
  if (Array.prototype.forEach) {
    LandmarkHelpers.forEach = function forEach(arr, cb, thisp) {
      return arr.forEach(cb, thisp);
    };
  } else {
    LandmarkHelpers.forEach = function forEach(arr, cb, thisp) {
      for (var i = 0; i < arr.length; i++)
        cb.call(thisp || arr, arr[i], i, arr);
    };
  }

  LandmarkHelpers.merge = _.merge;

  return LandmarkHelpers;
});