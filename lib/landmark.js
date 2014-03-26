/*!
 * Markdown
 * Released under MIT license
 * Copyright (c) 2009-2010 Dominic Baggott
 * Copyright (c) 2009-2010 Ash Berlin
 * Copyright (c) 2011 Christoph Dorn <christoph@christophdorn.com> (http://www.christophdorn.com)
 * Version: 0.6.0-beta1
 * Date: 2014-03-26T07:55Z
 */

(function(expose) {



  var MarkdownHelpers = {};

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

  MarkdownHelpers.mk_block = function(block, trail, line) {
    // Be helpful for default case in tests.
    if ( arguments.length === 1 )
      trail = "\n\n";

    // We actually need a String object, not a string primitive
    /* jshint -W053 */
    var s = new String(block);
    s.trailing = trail;
    // To make it clear its not just a string
    s.inspect = mk_block_inspect;
    s.toSource = mk_block_toSource;

    if ( line !== undefined )
      s.lineNumber = line;

    return s;
  };


  var isArray = MarkdownHelpers.isArray = Array.isArray || function(obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
  };

  // Don't mess with Array.prototype. Its not friendly
  if ( Array.prototype.forEach ) {
    MarkdownHelpers.forEach = function forEach( arr, cb, thisp ) {
      return arr.forEach( cb, thisp );
    };
  }
  else {
    MarkdownHelpers.forEach = function forEach(arr, cb, thisp) {
      for (var i = 0; i < arr.length; i++)
        cb.call(thisp || arr, arr[i], i, arr);
    };
  }

  MarkdownHelpers.isEmpty = function isEmpty( obj ) {
    for ( var key in obj ) {
      if ( hasOwnProperty.call( obj, key ) )
        return false;
    }
    return true;
  };

  MarkdownHelpers.extract_attr = function extract_attr( jsonml ) {
    return isArray(jsonml)
        && jsonml.length > 1
        && typeof jsonml[ 1 ] === "object"
        && !( isArray(jsonml[ 1 ]) )
        ? jsonml[ 1 ]
        : undefined;
  };



  var DialectHelpers = {};
  DialectHelpers.inline_until_char = function( text, want ) {
    var consumed = 0,
        nodes = [];

    while ( true ) {
      if ( text.charAt( consumed ) === want ) {
        // Found the character we were looking for
        consumed++;
        return [ consumed, nodes ];
      }

      if ( consumed >= text.length ) {
        // No closing char found. Abort.
        return [consumed, null, nodes];
      }

      var res = this.dialect.inline.__oneElement__.call(this, text.substr( consumed ) );
      consumed += res[ 0 ];
      // Add any returned nodes.
      nodes.push.apply( nodes, res.slice( 1 ) );
    }
  };

  // Helper function to make sub-classing a dialect easier
  DialectHelpers.subclassDialect = function( d ) {
    function Block() {}
    Block.prototype = d.block;
    function Inline() {}
    Inline.prototype = d.inline;

    return { block: new Block(), inline: new Inline() };
  };




 /**
   *  class Markdown
   *
   *  Markdown processing in Javascript done right. We have very particular views
   *  on what constitutes 'right' which include:
   *
   *  - produces well-formed HTML (this means that em and strong nesting is
   *    important)
   *
   *  - has an intermediate representation to allow processing of parsed data (We
   *    in fact have two, both as [JsonML]: a markdown tree and an HTML tree).
   *
   *  - is easily extensible to add new dialects without having to rewrite the
   *    entire parsing mechanics
   *
   *  - has a good test suite
   *
   *  This implementation fulfills all of these (except that the test suite could
   *  do with expanding to automatically run all the fixtures from other Markdown
   *  implementations.)
   *
   *  ##### Intermediate Representation
   *
   *  *TODO* Talk about this :) Its JsonML, but document the node names we use.
   *
   *  [JsonML]: http://jsonml.org/ "JSON Markup Language"
   **/
  var Markdown = function(dialect) {
    switch (typeof dialect) {
    case "undefined":
      this.dialect = Markdown.dialects.Gruber;
      break;
    case "object":
      this.dialect = dialect;
      break;
    default:
      if ( dialect in Markdown.dialects )
        this.dialect = Markdown.dialects[dialect];
      else
        throw new Error("Unknown Markdown dialect '" + String(dialect) + "'");
      break;
    }
    this.em_state = [];
    this.strong_state = [];
    this.debug_indent = "";
  };

  /**
   * Markdown.dialects
   *
   * Namespace of built-in dialects.
   **/
  Markdown.dialects = {};




  // Imported functions
  var mk_block = Markdown.mk_block = MarkdownHelpers.mk_block,
      isArray = MarkdownHelpers.isArray;

  /**
   *  parse( markdown, [dialect] ) -> JsonML
   *  - markdown (String): markdown string to parse
   *  - dialect (String | Dialect): the dialect to use, defaults to gruber
   *
   *  Parse `markdown` and return a markdown document as a Markdown.JsonML tree.
   **/
  Markdown.parse = function( source, dialect ) {
    // dialect will default if undefined
    var md = new Markdown( dialect );
    return md.toTree( source );
  };

  /**
   *  count_lines( str ) -> count
   *  - str (String): String whose lines we want to count
   *
   *  Counts the number of linebreaks in `str`
   **/
  function count_lines( str ) {
    return str.split("\n").length - 1;
  }

  // Internal - split source into rough blocks
  Markdown.prototype.split_blocks = function splitBlocks( input ) {
    // Normalize linebreaks to \n.
    input = input.replace(/\r\n?/g, "\n");
    // Match until the end of the string, a newline followed by #, or two or more newlines.
    // [\s\S] matches _anything_ (newline or space)
    // [^] is equivalent but doesn't work in IEs.
    var re = /([\s\S]+?)($|\n#|\n(?:\s*\n|$)+)/g,
        blocks = [],
        m;

    var line_no = 1;

    if ( ( m = /^(\s*\n)/.exec(input) ) !== null ) {
      // skip (but count) leading blank lines
      line_no += count_lines( m[0] );
      re.lastIndex = m[0].length;
    }

    while ( ( m = re.exec(input) ) !== null ) {
      if (m[2] === "\n#") {
        m[2] = "\n";
        re.lastIndex--;
      }
      blocks.push( mk_block( m[1], m[2], line_no ) );
      line_no += count_lines( m[0] );
    }

    return blocks;
  };

  /**
   *  Markdown#processBlock( block, next ) -> undefined | [ JsonML, ... ]
   *  - block (String): the block to process
   *  - next (Array): the following blocks
   *
   * Process `block` and return an array of JsonML nodes representing `block`.
   *
   * It does this by asking each block level function in the dialect to process
   * the block until one can. Succesful handling is indicated by returning an
   * array (with zero or more JsonML nodes), failure by a false value.
   *
   * Blocks handlers are responsible for calling [[Markdown#processInline]]
   * themselves as appropriate.
   *
   * If the blocks were split incorrectly or adjacent blocks need collapsing you
   * can adjust `next` in place using shift/splice etc.
   *
   * If any of this default behaviour is not right for the dialect, you can
   * define a `__call__` method on the dialect that will get invoked to handle
   * the block processing.
   */
  Markdown.prototype.processBlock = function processBlock( block, next ) {
    var cbs = this.dialect.block,
        ord = cbs.__order__;

    if ( "__call__" in cbs )
      return cbs.__call__.call(this, block, next);

    for ( var i = 0; i < ord.length; i++ ) {
      //D:this.debug( "Testing", ord[i] );
      var res = cbs[ ord[i] ].call( this, block, next );
      if ( res ) {

        if ( !isArray(res) || ( res.length > 0 && !( isArray(res[0]) ) && ( typeof res[0] !== "string")) ) {
          this.debug(ord[i], "didn't return proper JsonML");
        }

        return res;
      }
    }

    // Uhoh! no match! Should we throw an error?
    return [];
  };

  Markdown.prototype.processInline = function processInline( block ) {
    return this.dialect.inline.__call__.call( this, String( block ) );
  };

  /**
   *  Markdown#toTree( source ) -> JsonML
   *  - source (String): markdown source to parse
   *
   *  Parse `source` into a JsonML tree representing the markdown document.
   **/
  // custom_tree means set this.tree to `custom_tree` and restore old value on return
  Markdown.prototype.toTree = function toTree( source, custom_root ) {
    var blocks = source instanceof Array ? source : this.split_blocks( source );

    // Make tree a member variable so its easier to mess with in extensions
    var old_tree = this.tree;
    try {
      this.tree = custom_root || this.tree || [ "markdown" ];

      blocks_loop:
      while ( blocks.length ) {
        var b = this.processBlock( blocks.shift(), blocks );

        // Reference blocks and the like won't return any content
        if ( !b.length )
          continue blocks_loop;

        this.tree.push.apply( this.tree, b );
      }
      return this.tree;
    }
    finally {
      if ( custom_root )
        this.tree = old_tree;
    }
  };

  // Noop by default
  Markdown.prototype.debug = function () {
    var args = Array.prototype.slice.call( arguments);
    args.unshift(this.debug_indent);
    if ( typeof print !== "undefined" )
      print.apply( print, args );
    if ( typeof console !== "undefined" && typeof console.log !== "undefined" )
      console.log.apply( null, args );
  };

  Markdown.prototype.loop_re_over_block = function( re, block, cb ) {
    // Dont use /g regexps with this
    var m,
        b = block.valueOf();

    while ( b.length && (m = re.exec(b) ) !== null ) {
      b = b.substr( m[0].length );
      cb.call(this, m);
    }
    return b;
  };

  // Build default order from insertion order.
  Markdown.buildBlockOrder = function(d) {
    var ord = [];
    for ( var i in d ) {
      if ( i === "__order__" || i === "__call__" )
        continue;
      ord.push( i );
    }
    d.__order__ = ord;
  };

  // Build patterns for inline matcher
  Markdown.buildInlinePatterns = function(d) {
    var patterns = [];

    for ( var i in d ) {
      // __foo__ is reserved and not a pattern
      if ( i.match( /^__.*__$/) )
        continue;
      var l = i.replace( /([\\.*+?^$|()\[\]{}])/g, "\\$1" )
               .replace( /\n/, "\\n" );
      patterns.push( i.length === 1 ? l : "(?:" + l + ")" );
    }

    patterns = patterns.join("|");
    d.__patterns__ = patterns;
    //print("patterns:", uneval( patterns ) );

    var fn = d.__call__;
    d.__call__ = function(text, pattern) {
      if ( pattern !== undefined )
        return fn.call(this, text, pattern);
      else
        return fn.call(this, text, patterns);
    };
  };




  var forEach = MarkdownHelpers.forEach,
      extract_attr = MarkdownHelpers.extract_attr,
      mk_block = MarkdownHelpers.mk_block,
      isEmpty = MarkdownHelpers.isEmpty,
      inline_until_char = DialectHelpers.inline_until_char;

  // A robust regexp for matching URLs. Thanks: https://gist.github.com/dperini/729294
  var urlRegexp = /(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?/i.source;

  /**
   * Gruber dialect
   *
   * The default dialect that follows the rules set out by John Gruber's
   * markdown.pl as closely as possible. Well actually we follow the behaviour of
   * that script which in some places is not exactly what the syntax web page
   * says.
   **/
  var Gruber = {
    block: {
      atxHeader: function atxHeader( block, next ) {
        var m = block.match( /^(#{1,6})\s*(.*?)\s*#*\s*(?:\n|$)/ );

        if ( !m )
          return undefined;

        var header = [ "header", { level: m[ 1 ].length } ];
        Array.prototype.push.apply(header, this.processInline(m[ 2 ]));

        if ( m[0].length < block.length )
          next.unshift( mk_block( block.substr( m[0].length ), block.trailing, block.lineNumber + 2 ) );

        return [ header ];
      },

      setextHeader: function setextHeader( block, next ) {
        var m = block.match( /^(.*)\n([-=])\2\2+(?:\n|$)/ );

        if ( !m )
          return undefined;

        var level = ( m[ 2 ] === "=" ) ? 1 : 2,
            header = [ "header", { level : level } ].concat( this.processInline(m[ 1 ]) );

        if ( m[0].length < block.length )
          next.unshift( mk_block( block.substr( m[0].length ), block.trailing, block.lineNumber + 2 ) );

        return [ header ];
      },

      code: function code( block, next ) {
        // |    Foo
        // |bar
        // should be a code block followed by a paragraph. Fun
        //
        // There might also be adjacent code block to merge.

        var ret = [],
            re = /^(?: {0,3}\t| {4})(.*)\n?/;

        // 4 spaces + content
        if ( !block.match( re ) )
          return undefined;

        block_search:
        do {
          // Now pull out the rest of the lines
          var b = this.loop_re_over_block(
                    re, block.valueOf(), function( m ) { ret.push( m[1] ); } );

          if ( b.length ) {
            // Case alluded to in first comment. push it back on as a new block
            next.unshift( mk_block(b, block.trailing) );
            break block_search;
          }
          else if ( next.length ) {
            // Check the next block - it might be code too
            if ( !next[0].match( re ) )
              break block_search;

            // Pull how how many blanks lines follow - minus two to account for .join
            ret.push ( block.trailing.replace(/[^\n]/g, "").substring(2) );

            block = next.shift();
          }
          else {
            break block_search;
          }
        } while ( true );

        return [ [ "code_block", ret.join("\n") ] ];
      },

      horizRule: function horizRule( block, next ) {
        // this needs to find any hr in the block to handle abutting blocks
        var m = block.match( /^(?:([\s\S]*?)\n)?[ \t]*([-_*])(?:[ \t]*\2){2,}[ \t]*(?:\n([\s\S]*))?$/ );

        if ( !m )
          return undefined;

        var jsonml = [ [ "hr" ] ];

        // if there's a leading abutting block, process it
        if ( m[ 1 ] ) {
          var contained = mk_block( m[ 1 ], "", block.lineNumber );
          jsonml.unshift.apply( jsonml, this.toTree( contained, [] ) );
        }

        // if there's a trailing abutting block, stick it into next
        if ( m[ 3 ] )
          next.unshift( mk_block( m[ 3 ], block.trailing, block.lineNumber + 1 ) );

        return jsonml;
      },

      // There are two types of lists. Tight and loose. Tight lists have no whitespace
      // between the items (and result in text just in the <li>) and loose lists,
      // which have an empty line between list items, resulting in (one or more)
      // paragraphs inside the <li>.
      //
      // There are all sorts weird edge cases about the original markdown.pl's
      // handling of lists:
      //
      // * Nested lists are supposed to be indented by four chars per level. But
      //   if they aren't, you can get a nested list by indenting by less than
      //   four so long as the indent doesn't match an indent of an existing list
      //   item in the 'nest stack'.
      //
      // * The type of the list (bullet or number) is controlled just by the
      //    first item at the indent. Subsequent changes are ignored unless they
      //    are for nested lists
      //
      lists: (function( ) {
        // Use a closure to hide a few variables.
        var any_list = "[*+-]|\\d+\\.",
            bullet_list = /[*+-]/,
            // Capture leading indent as it matters for determining nested lists.
            is_list_re = new RegExp( "^( {0,3})(" + any_list + ")[ \t]+" ),
            indent_re = "(?: {0,3}\\t| {4})";

        // TODO: Cache this regexp for certain depths.
        // Create a regexp suitable for matching an li for a given stack depth
        function regex_for_depth( depth ) {

          return new RegExp(
            // m[1] = indent, m[2] = list_type
            "(?:^(" + indent_re + "{0," + depth + "} {0,3})(" + any_list + ")\\s+)|" +
            // m[3] = cont
            "(^" + indent_re + "{0," + (depth-1) + "}[ ]{0,4})"
          );
        }
        function expand_tab( input ) {
          return input.replace( / {0,3}\t/g, "    " );
        }

        // Add inline content `inline` to `li`. inline comes from processInline
        // so is an array of content
        function add(li, loose, inline, nl) {
          if ( loose ) {
            li.push( [ "para" ].concat(inline) );
            return;
          }
          // Hmmm, should this be any block level element or just paras?
          var add_to = li[li.length -1] instanceof Array && li[li.length - 1][0] === "para"
                     ? li[li.length -1]
                     : li;

          // If there is already some content in this list, add the new line in
          if ( nl && li.length > 1 )
            inline.unshift(nl);

          for ( var i = 0; i < inline.length; i++ ) {
            var what = inline[i],
                is_str = typeof what === "string";
            if ( is_str && add_to.length > 1 && typeof add_to[add_to.length-1] === "string" )
              add_to[ add_to.length-1 ] += what;
            else
              add_to.push( what );
          }
        }

        // contained means have an indent greater than the current one. On
        // *every* line in the block
        function get_contained_blocks( depth, blocks ) {

          var re = new RegExp( "^(" + indent_re + "{" + depth + "}.*?\\n?)*$" ),
              replace = new RegExp("^" + indent_re + "{" + depth + "}", "gm"),
              ret = [];

          while ( blocks.length > 0 ) {
            if ( re.exec( blocks[0] ) ) {
              var b = blocks.shift(),
                  // Now remove that indent
                  x = b.replace( replace, "");

              ret.push( mk_block( x, b.trailing, b.lineNumber ) );
            }
            else
              break;
          }
          return ret;
        }

        // passed to stack.forEach to turn list items up the stack into paras
        function paragraphify(s, i, stack) {
          var list = s.list;
          var last_li = list[list.length-1];

          if ( last_li[1] instanceof Array && last_li[1][0] === "para" )
            return;

          if ( i + 1 === stack.length ) {
            // Last stack frame
            // Keep the same array, but replace the contents
            last_li.push( ["para"].concat( last_li.splice(1, last_li.length - 1) ) );
          }
          else {
            var sublist = last_li.pop();
            last_li.push( ["para"].concat( last_li.splice(1, last_li.length - 1) ), sublist );
          }
        }

        // The matcher function
        return function( block, next ) {
          var m = block.match( is_list_re );
          if ( !m )
            return undefined;

          function make_list( m ) {
            var list = bullet_list.exec( m[2] )
                     ? ["bulletlist"]
                     : ["numberlist"];

            stack.push( { list: list, indent: m[1] } );
            return list;
          }


          var stack = [], // Stack of lists for nesting.
              list = make_list( m ),
              last_li,
              loose = false,
              ret = [ stack[0].list ],
              i;

          // Loop to search over block looking for inner block elements and loose lists
          loose_search:
          while ( true ) {
            // Split into lines preserving new lines at end of line
            var lines = block.split( /(?=\n)/ );

            // We have to grab all lines for a li and call processInline on them
            // once as there are some inline things that can span lines.
            var li_accumulate = "", nl = "";

            // Loop over the lines in this block looking for tight lists.
            tight_search:
            for ( var line_no = 0; line_no < lines.length; line_no++ ) {
              nl = "";
              var l = lines[line_no].replace(/^\n/, function(n) { nl = n; return ""; });


              // TODO: really should cache this
              var line_re = regex_for_depth( stack.length );

              m = l.match( line_re );
              //print( "line:", uneval(l), "\nline match:", uneval(m) );

              // We have a list item
              if ( m[1] !== undefined ) {
                // Process the previous list item, if any
                if ( li_accumulate.length ) {
                  add( last_li, loose, this.processInline( li_accumulate ), nl );
                  // Loose mode will have been dealt with. Reset it
                  loose = false;
                  li_accumulate = "";
                }

                m[1] = expand_tab( m[1] );
                var wanted_depth = Math.floor(m[1].length/4)+1;
                //print( "want:", wanted_depth, "stack:", stack.length);
                if ( wanted_depth > stack.length ) {
                  // Deep enough for a nested list outright
                  //print ( "new nested list" );
                  list = make_list( m );
                  last_li.push( list );
                  last_li = list[1] = [ "listitem" ];
                }
                else {
                  // We aren't deep enough to be strictly a new level. This is
                  // where Md.pl goes nuts. If the indent matches a level in the
                  // stack, put it there, else put it one deeper then the
                  // wanted_depth deserves.
                  var found = false;
                  for ( i = 0; i < stack.length; i++ ) {
                    if ( stack[ i ].indent !== m[1] )
                      continue;

                    list = stack[ i ].list;
                    stack.splice( i+1, stack.length - (i+1) );
                    found = true;
                    break;
                  }

                  if (!found) {
                    //print("not found. l:", uneval(l));
                    wanted_depth++;
                    if ( wanted_depth <= stack.length ) {
                      stack.splice(wanted_depth, stack.length - wanted_depth);
                      //print("Desired depth now", wanted_depth, "stack:", stack.length);
                      list = stack[wanted_depth-1].list;
                      //print("list:", uneval(list) );
                    }
                    else {
                      //print ("made new stack for messy indent");
                      list = make_list(m);
                      last_li.push(list);
                    }
                  }

                  //print( uneval(list), "last", list === stack[stack.length-1].list );
                  last_li = [ "listitem" ];
                  list.push(last_li);
                } // end depth of shenegains
                nl = "";
              }

              // Add content
              if ( l.length > m[0].length )
                li_accumulate += nl + l.substr( m[0].length );
            } // tight_search

            if ( li_accumulate.length ) {
              
              var contents = this.processBlock(li_accumulate, []),
                  firstBlock = contents[0];

              firstBlock.shift();
              contents.splice.apply(contents, [0, 1].concat(firstBlock));
              add( last_li, loose, contents, nl );

              // Let's not creating a trailing \n after content in the li
              if(last_li[last_li.length-1] === "\n") {
                last_li.pop();
              }

              // Loose mode will have been dealt with. Reset it
              loose = false;
              li_accumulate = "";
            }

            // Look at the next block - we might have a loose list. Or an extra
            // paragraph for the current li
            var contained = get_contained_blocks( stack.length, next );

            // Deal with code blocks or properly nested lists
            if ( contained.length > 0 ) {
              // Make sure all listitems up the stack are paragraphs
              forEach( stack, paragraphify, this);

              last_li.push.apply( last_li, this.toTree( contained, [] ) );
            }

            var next_block = next[0] && next[0].valueOf() || "";

            if ( next_block.match(is_list_re) || next_block.match( /^ / ) ) {
              block = next.shift();

              // Check for an HR following a list: features/lists/hr_abutting
              var hr = this.dialect.block.horizRule( block, next );

              if ( hr ) {
                ret.push.apply(ret, hr);
                break;
              }

              // Add paragraphs if the indentation level stays the same
              if (stack[stack.length-1].indent === block.match(/^\s*/)[0]) {
                forEach( stack, paragraphify, this);
              }

              loose = true;
              continue loose_search;
            }
            break;
          } // loose_search

          return ret;
        };
      })(),

      blockquote: function blockquote( block, next ) {

        // Handle quotes that have spaces before them
        var m = /(^|\n) +(\>[\s\S]*)/.exec(block);
        if (m && m[2] && m[2].length) {
          var blockContents = block.replace(/(^|\n) +\>/, "$1>");
          next.unshift(blockContents);
          return [];
        }

        if ( !block.match( /^>/m ) )
          return undefined;

        var jsonml = [];

        // separate out the leading abutting block, if any. I.e. in this case:
        //
        //  a
        //  > b
        //
        if ( block[ 0 ] !== ">" ) {
          var lines = block.split( /\n/ ),
              prev = [],
              line_no = block.lineNumber;

          // keep shifting lines until you find a crotchet
          while ( lines.length && lines[ 0 ][ 0 ] !== ">" ) {
            prev.push( lines.shift() );
            line_no++;
          }

          var abutting = mk_block( prev.join( "\n" ), "\n", block.lineNumber );
          jsonml.push.apply( jsonml, this.processBlock( abutting, [] ) );
          // reassemble new block of just block quotes!
          block = mk_block( lines.join( "\n" ), block.trailing, line_no );
        }


        // if the next block is also a blockquote merge it in
        while ( next.length && next[ 0 ][ 0 ] === ">" ) {
          var b = next.shift();
          block = mk_block( block + block.trailing + b, b.trailing, block.lineNumber );
        }

        // Strip off the leading "> " and re-process as a block.
        var input = block.replace( /^> ?/gm, "" ),
            old_tree = this.tree,
            processedBlock = this.toTree( input, [ "blockquote" ] ),
            attr = extract_attr( processedBlock );

        // If any link references were found get rid of them
        if ( attr && attr.references ) {
          delete attr.references;
          // And then remove the attribute object if it's empty
          if ( isEmpty( attr ) )
            processedBlock.splice( 1, 1 );
        }

        jsonml.push( processedBlock );
        return jsonml;
      },

      referenceDefn: function referenceDefn( block, next) {
        var re = /^\s*\[(.*?)\]:\s*(\S+)(?:\s+(?:(['"])(.*)\3|\((.*?)\)))?\n?/;
        // interesting matches are [ , ref_id, url, , title, title ]

        if ( !block.match(re) )
          return undefined;

        var attrs = create_attrs.call( this );

        var b = this.loop_re_over_block(re, block, function( m ) {
          create_reference(attrs, m);
        } );

        if ( b.length )
          next.unshift( mk_block( b, block.trailing ) );

        return [];
      },

      para: function para( block ) {
        // everything's a para!
        return [ ["para"].concat( this.processInline( block ) ) ];
      }
    },

    inline: {

      __oneElement__: function oneElement( text, patterns_or_re, previous_nodes ) {
        var m,
            res;

        patterns_or_re = patterns_or_re || this.dialect.inline.__patterns__;
        var re = new RegExp( "([\\s\\S]*?)(" + (patterns_or_re.source || patterns_or_re) + ")" );

        m = re.exec( text );
        if (!m) {
          // Just boring text
          return [ text.length, text ];
        }
        else if ( m[1] ) {
          // Some un-interesting text matched. Return that first
          return [ m[1].length, m[1] ];
        }

        var res;
        if ( m[2] in this.dialect.inline ) {
          res = this.dialect.inline[ m[2] ].call(
                    this,
                    text.substr( m.index ), m, previous_nodes || [] );
        }
        // Default for now to make dev easier. just slurp special and output it.
        res = res || [ m[2].length, m[2] ];
        return res;
      },

      __call__: function inline( text, patterns ) {

        var out = [],
            res;

        function add(x) {
          //D:self.debug("  adding output", uneval(x));
          if ( typeof x === "string" && typeof out[out.length-1] === "string" )
            out[ out.length-1 ] += x;
          else
            out.push(x);
        }

        while ( text.length > 0 ) {
          res = this.dialect.inline.__oneElement__.call(this, text, patterns, out );
          text = text.substr( res.shift() );
          forEach(res, add );
        }

        return out;
      },

      // These characters are interesting elsewhere, so have rules for them so that
      // chunks of plain text blocks don't include them
      "]": function () {},
      "}": function () {},

      __escape__ : /^\\[\\`\*_{}<>\[\]()#\+.!\-]/,

      "\\": function escaped( text ) {
        // [ length of input processed, node/children to add... ]
        // Only esacape: \ ` * _ { } [ ] ( ) # * + - . !
        if ( this.dialect.inline.__escape__.exec( text ) )
          return [ 2, text.charAt( 1 ) ];
        else
          // Not an esacpe
          return [ 1, "\\" ];
      },

      "![": function image( text ) {

        // Without this guard V8 crashes hard on the RegExp
        if (text.indexOf('(') >= 0 && text.indexOf(')') === -1) { return; }

        // Unlike images, alt text is plain text only. no other elements are
        // allowed in there

        // ![Alt text](/path/to/img.jpg "Optional title")
        //      1          2            3       4         <--- captures
        //
        // First attempt to use a strong URL regexp to catch things like parentheses. If it misses, use the
        // old one.
        var m = text.match(new RegExp("^!\\[(.*?)][ \\t]*\\((" + urlRegexp + ")\\)([ \\t])*([\"'].*[\"'])?")) ||
                text.match( /^!\[(.*?)\][ \t]*\([ \t]*([^")]*?)(?:[ \t]+(["'])(.*?)\3)?[ \t]*\)/ );

        if ( m ) {
          if ( m[2] && m[2][0] === "<" && m[2][m[2].length-1] === ">" )
            m[2] = m[2].substring( 1, m[2].length - 1 );

          m[2] = this.dialect.inline.__call__.call( this, m[2], /\\/ )[0];

          var attrs = { alt: m[1], href: m[2] || "" };
          if ( m[4] !== undefined)
            attrs.title = m[4];

          return [ m[0].length, [ "img", attrs ] ];
        }

        // ![Alt text][id]
        m = text.match( /^!\[(.*?)\][ \t]*\[(.*?)\]/ );

        if ( m ) {
          // We can't check if the reference is known here as it likely wont be
          // found till after. Check it in md tree->hmtl tree conversion
          return [ m[0].length, [ "img_ref", { alt: m[1], ref: m[2].toLowerCase(), original: m[0] } ] ];
        }

        // Just consume the '!['
        return [ 2, "![" ];
      },

      "[": function link( text ) {

        var open = 1;
        for (var i=0; i<text.length; i++) {
          var c = text.charAt(i);
          if (c === '[') { open++; }
          if (c === ']') { open--; }

          if (open > 3) { return [1, "["]; }
        }

        var orig = String(text);
        // Inline content is possible inside `link text`
        var res = inline_until_char.call( this, text.substr(1), "]" );

        // No closing ']' found. Just consume the [
        if ( !res[1] ) {
          var size = res[0] + 1;
          return [ size, text.charAt(0) + res[2].join('') ];
        }

        var consumed = 1 + res[ 0 ],
            children = res[ 1 ],
            link,
            attrs;

        // At this point the first [...] has been parsed. See what follows to find
        // out which kind of link we are (reference or direct url)
        text = text.substr( consumed );

        // [link text](/path/to/img.jpg "Optional title")
        //                 1            2       3         <--- captures
        // This will capture up to the last paren in the block. We then pull
        // back based on if there a matching ones in the url
        //    ([here](/url/(test))
        // The parens have to be balanced
        var m = text.match( /^\s*\([ \t]*([^"']*)(?:[ \t]+(["'])(.*?)\2)?[ \t]*\)/ );
        if ( m ) {
          var url = m[1].replace(/\s+$/, '');
          consumed += m[0].length;

          if ( url && url[0] === "<" && url[url.length-1] === ">" )
            url = url.substring( 1, url.length - 1 );

          // If there is a title we don't have to worry about parens in the url
          if ( !m[3] ) {
            var open_parens = 1; // One open that isn't in the capture
            for ( var len = 0; len < url.length; len++ ) {
              switch ( url[len] ) {
              case "(":
                open_parens++;
                break;
              case ")":
                if ( --open_parens === 0) {
                  consumed -= url.length - len;
                  url = url.substring(0, len);
                }
                break;
              }
            }
          }

          // Process escapes only
          url = this.dialect.inline.__call__.call( this, url, /\\/ )[0];

          attrs = { href: url || "" };
          if ( m[3] !== undefined)
            attrs.title = m[3];

          link = [ "link", attrs ].concat( children );
          return [ consumed, link ];
        }

        m = text.match(new RegExp("^\\((" + urlRegexp + ")\\)"));
        if (m && m[1]) {
          consumed += m[0].length;
          link = ["link", {href: m[1]}].concat(children);
          return [consumed, link];
        }

        // [Alt text][id]
        // [Alt text] [id]
        m = text.match( /^\s*\[(.*?)\]/ );
        if ( m ) {

          consumed += m[ 0 ].length;

          // [links][] uses links as its reference
          attrs = { ref: ( m[ 1 ] || String(children) ).toLowerCase(),  original: orig.substr( 0, consumed ) };

          link = [ "link_ref", attrs ].concat( children );

          // We can't check if the reference is known here as it likely wont be
          // found till after. Check it in md tree->hmtl tree conversion.
          // Store the original so that conversion can revert if the ref isn't found.
          return [ consumed, link ];
        }

        // Another check for references
        m = orig.match(/^\s*\[(.*?)\]:\s*(\S+)(?:\s+(?:(['"])(.*?)\3|\((.*?)\)))?\n?/);
        if (m) {
          var attrs = create_attrs.call(this);
          create_reference(attrs, m);
          return [ m[0].length ];
        }

        // [id]
        // Only if id is plain (no formatting.)
        if ( children.length === 1 && typeof children[0] === "string" ) {

          var normalized = children[0].toLowerCase().replace(/\s+/, ' ');
          attrs = { ref: normalized,  original: orig.substr( 0, consumed ) };
          link = [ "link_ref", attrs, children[0] ];
          return [ consumed, link ];
        }

        // Just consume the "["
        return [ 1, "[" ];
      },


      "<": function autoLink( text ) {
        var m;

        if ( ( m = text.match( /^<(?:((https?|ftp|mailto):[^>]+)|(.*?@.*?\.[a-zA-Z]+))>/ ) ) !== null ) {
          if ( m[3] )
            return [ m[0].length, [ "link", { href: "mailto:" + m[3] }, m[3] ] ];
          else if ( m[2] === "mailto" )
            return [ m[0].length, [ "link", { href: m[1] }, m[1].substr("mailto:".length ) ] ];
          else
            return [ m[0].length, [ "link", { href: m[1] }, m[1] ] ];
        }

        return [ 1, "<" ];
      },

      "`": function inlineCode( text ) {
        // Inline code block. as many backticks as you like to start it
        // Always skip over the opening ticks.
        var m = text.match( /(`+)(([\s\S]*?)\1)/ );

        if ( m && m[2] )
          return [ m[1].length + m[2].length, [ "inlinecode", m[3] ] ];
        else {
          // TODO: No matching end code found - warn!
          return [ 1, "`" ];
        }
      },

      "  \n": function lineBreak() {
        return [ 3, [ "linebreak" ] ];
      }

    }
  };

  // Meta Helper/generator method for em and strong handling
  function strong_em( tag, md ) {

    var state_slot = tag + "_state",
        other_slot = tag === "strong" ? "em_state" : "strong_state";

    function CloseTag(len) {
      this.len_after = len;
      this.name = "close_" + md;
    }

    return function ( text ) {

      if ( this[state_slot][0] === md ) {
        // Most recent em is of this type
        //D:this.debug("closing", md);
        this[state_slot].shift();

        // "Consume" everything to go back to the recursion in the else-block below
        return[ text.length, new CloseTag(text.length-md.length) ];
      }
      else {
        // Store a clone of the em/strong states
        var other = this[other_slot].slice(),
            state = this[state_slot].slice();

        this[state_slot].unshift(md);

        //D:this.debug_indent += "  ";

        // Recurse
        var res = this.processInline( text.substr( md.length ) );
        //D:this.debug_indent = this.debug_indent.substr(2);

        var last = res[res.length - 1];

        //D:this.debug("processInline from", tag + ": ", uneval( res ) );

        var check = this[state_slot].shift();
        if ( last instanceof CloseTag ) {
          res.pop();
          // We matched! Huzzah.
          var consumed = text.length - last.len_after;
          return [ consumed, [ tag ].concat(res) ];
        }
        else {
          // Restore the state of the other kind. We might have mistakenly closed it.
          this[other_slot] = other;
          this[state_slot] = state;

          // We can't reuse the processed result as it could have wrong parsing contexts in it.
          return [ md.length, md ];
        }
      }
    }; // End returned function
  }

  // A helper function to create attributes
  function create_attrs() {
    if ( !extract_attr( this.tree ) ) {
      this.tree.splice( 1, 0, {} );
    }

    var attrs = extract_attr( this.tree );

    // make a references hash if it doesn't exist
    if ( attrs.references === undefined ) {
      attrs.references = {};
    }

    return attrs;
  }

  // Create references for attributes
  function create_reference(attrs, m) {
    if ( m[2] && m[2][0] === "<" && m[2][m[2].length-1] === ">" )
      m[2] = m[2].substring( 1, m[2].length - 1 );

    var ref = attrs.references[ m[1].toLowerCase() ] = {
      href: m[2]
    };

    if ( m[4] !== undefined )
      ref.title = m[4];
    else if ( m[5] !== undefined )
      ref.title = m[5];
  }

  Gruber.inline["**"] = strong_em("strong", "**");
  Gruber.inline["__"] = strong_em("strong", "__");
  Gruber.inline["*"]  = strong_em("em", "*");
  Gruber.inline["_"]  = strong_em("em", "_");

  Markdown.dialects.Gruber = Gruber;
  Markdown.buildBlockOrder ( Markdown.dialects.Gruber.block );
  Markdown.buildInlinePatterns( Markdown.dialects.Gruber.inline );
/**
  Landmark.DialectHelper class
  Stolen from https://github.com/discourse/discourse/blob/master/vendor/assets/javascripts/better_markdown.js
*/

// Released under MIT license
// Copyright (c) 2009-2010 Dominic Baggott
// Copyright (c) 2009-2010 Ash Berlin
// Copyright (c) 2011 Christoph Dorn <christoph@christophdorn.com> (http://www.christophdorn.com)

/*jshint browser:true, devel:true */


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


	var BlockHeaderLexicon = {
		name: "atxHeader",
		emitter: function(block, next) {
			var m = block.match(/^(#{1,6})\s(.*?)\s*#*\s*(?:\n|$)/);

			if (!m)
				return;

			var header = ["header", {
				level: m[1].length
			}];
			Array.prototype.push.apply(header, this.processInline(m[2]));

			if (m[0].length < block.length)
				next.unshift(LandmarkHelpers.mk_block(block.substr(m[0].length), block.trailing, block.lineNumber + 2));

			return [header];
		},

		register: function(dialect) {
			var lexicon = this;
			lexicon.dialect = dialect;
			dialect.block[lexicon.name] = lexicon.emitter;
		}
	};

	module.exports = BlockHeaderLexicon;



	var DEFAULT_CODE_ACCEPTABLE_LANGUAGES =
		["lang-auto", "1c", "actionscript", "apache", "applescript", "avrasm", "axapta", "bash", "brainfuck",
		"clojure", "cmake", "coffeescript", "cpp", "cs", "css", "d", "delphi", "diff", "xml", "django", "dos",
		"erlang-repl", "erlang", "glsl", "go", "handlebars", "haskell", "http", "ini", "java", "javascript",
		"json", "lisp", "lua", "markdown", "matlab", "mel", "nginx", "objectivec", "parser3", "perl", "php",
		"profile", "python", "r", "rib", "rsl", "ruby", "rust", "scala", "smalltalk", "sql", "tex", "text",
		"vala", "vbscript", "vhdl"
	];

	var BlockCodeLexicon = {
		alias: 'code',
		name: "code",
		start: /^\s*`{3}([^\n\[\]]+)?\n?([\s\S]*)?/gm,
		stop: '```',
		rawContents: true,

		emitter: function(blockContents, matches) {

			var klass = this.dialect.options.code_default_language;
			var acceptableCodeClasses = this.dialect.options.code_languages ? this.dialect.options.code_languages : DEFAULT_CODE_ACCEPTABLE_LANGUAGES;

			if (matches[1] && acceptableCodeClasses.indexOf(matches[1]) !== -1) {
				klass = matches[1];
			}

			var attrs = klass ? {"class": klass} : {};

			// for (var i in blockContents) {
			//	blockContents[i] = blockContents[i].trim();
			// }

			return ['pre', ['code', attrs,
				blockContents.join(["\n"]).trim()
			]];
		},

		register: function(dialect) {
			var lexicon = this;
			lexicon.dialect = dialect;
			dialect.replaceBlock({
				start: lexicon.start,
				stop: lexicon.stop,
				rawContents: lexicon.rawContents,
				wordBoundary: lexicon.wordBoundary,
				emitter: lexicon.emitter,
				dialect: lexicon.dialect
			});
		}
	};

	module.exports = BlockCodeLexicon;



	var BlockHorizontalRuleLexicon = {
		alias: 'horizRule',
		name: "horizRule",
		pattern: /^(?:([\s\S]*?)\n)?[ \t]*([-=])(?:[ \t]*\2){2,}[ \t]*(?:\n([\s\S]*))?$/,
		// pattern: /^(?:([\s\S]*?)\n)?[ \t]*([-=#*_=]{5,})[ \t]*(?:\n([\s\S]*))?$/,

		emitter: function(block, next) {
			// this needs to find any hr in the block to handle abutting blocks
			var m = block.match(this.pattern);
			var attrs = {};

			if (!m)
				return undefined;

			/* TODO: Add style class?
			switch(m[2]) {
			case "-":
				attrs = {"class": "dash"};
				break;
			case "_":
				attrs = {"class": "underline"};
				break;
			case "*":
				attrs = {"class": "asterisk"};
				break;
			case "=":
				attrs = {"class": "dash"};
				break;
			}*/

			var jsonml = [
				["hr", attrs]
			];

			// if there's a leading abutting block, process it
			if (m[1]) {
				var contained = this.mk_block(m[1], "", block.lineNumber);
				jsonml.unshift.apply(jsonml, this.toTree(contained, []));
			}

			// if there's a trailing abutting block, stick it into next
			if (m[3])
				next.unshift(this.mk_block(m[3], block.trailing, block.lineNumber + 1));

			return jsonml;
		},

		register: function(dialect) {
			var lexicon = this;
			lexicon.dialect = dialect;
			dialect.block[lexicon.name] = lexicon.emitter;
		}
	};

	module.exports = BlockHorizontalRuleLexicon;



	var BlockQuoteLexicon = {
		alias: "blockquote",
		name: "blockquote",

		emitter: function(block, next) {
			// Handle quotes that have spaces before them
			var m = /(^|\n) +(\>[\s\S]*)/.exec(block);

			if (m && m[2] && m[2].length) {
				var blockContents = block.replace(/(^|\n) +\>/, "$1>");
				next.unshift(blockContents);
				return [];
			}

			if (!block.match(/^>/m))
				return undefined;

			var jsonml = [];

			// separate out the leading abutting block, if any. I.e. in this case:
			//
			//  a
			//  > b
			//
			if (block[0] !== ">") {
				var lines = block.split(/\n/),
					prev = [],
					line_no = block.lineNumber;

				// keep shifting lines until you find a crotchet
				while (lines.length && lines[0][0] !== ">") {
					prev.push(lines.shift());
					line_no++;
				}

				var abutting = LandmarkHelpers.mk_block(prev.join("\n"), "\n", block.lineNumber);
				jsonml.push.apply(jsonml, this.processBlock(abutting, []));
				// reassemble new block of just block quotes!
				block = LandmarkHelpers.mk_block(lines.join("\n"), block.trailing, line_no);
			}


			// if the next block is also a blockquote merge it in
			while (next.length && next[0][0] === ">") {
				var b = next.shift();
				block = LandmarkHelpers.mk_block(block + block.trailing + b, b.trailing, block.lineNumber);
			}

			// Strip off the leading "> " and re-process as a block.
			var input = block.replace(/^> ?/gm, ""),
				old_tree = this.tree,
				processedBlock = this.toTree(input, ["blockquote"]),
				attr = LandmarkHelpers.extract_attr(processedBlock);

			// If any link references were found get rid of them
			if (attr && attr.references) {
				delete attr.references;
				// And then remove the attribute object if it's empty
				if (LandmarkHelpers.isEmpty(attr))
					processedBlock.splice(1, 1);
			}

			jsonml.push(processedBlock);
			return jsonml;
		},

		register: function(dialect) {
			var lexicon = this;
			lexicon.dialect = dialect;
			dialect.block[lexicon.name] = lexicon.emitter;
		}
	};


  var BlockParagraphLexicon = {
    name: "para",
    alias: "paragraph",
    emitter: function(block, next) {
      return [["para"].concat(this.processInline(block))];
    },

    register: function(dialect) {
      var lexicon = this;
      lexicon.dialect = dialect;
      dialect.registerBlock(lexicon.name, lexicon.emitter);
    }
  };
/**
  If a line contains a single quote, convert it to a blockquote. For example:

  "My fake plants died because I did not pretend to water them."

  Would be:

  <blockquote>My fake plants died because I did not pretend to water them.</blockquote>

**/

  var InlineAutoQuoteLexicon = {
    start: '"',

    emitter: function(text, match, prev) {
      if (prev) {
        var last = prev[prev.length - 1];
        if (typeof last === "string") {
          return;
        }
      }

      if (text.length > 2 && text.charAt(0) === '"' && text.charAt(text.length - 1) === '"') {
        var inner = text.substr(1, text.length - 2);
        if (inner.indexOf('"') === -1 && inner.indexOf("\n") === -1) {
          return [text.length, ['blockquote', inner]];
        }
      }
      return;
    },

    register: function(dialect) {
      var lexicon = this;
      lexicon.dialect = dialect;
      dialect.inline[lexicon.start] = function(text) {
        return lexicon.emitter(text);
      };
    }
  };

  module.exports = InlineAutoQuoteLexicon;




	var ed2kLinkLexicon = {
		start: "ed2k",
		pattern: /^(ed2k:(?:\/{1,3})\|file\|(?:.+?)\|\/(?!\|))/gm,

		emitter: function(text, match, prev) {
			var matches = text.match(this.pattern);

			if (matches) {
				var url = matches[0],
					display = url;

				if (url.match(/\]\[\d$/)) {
					return;
				}

				if (url.match(/\(ed2k/)) {
					return;
				}

				return [display.length, ["a", {
						"href": url,
						"class": "p2p-link ed2k"
					},
					display
				]];
			}
			return;
		}
	};

	var thunderLinkLexicon = {
		start: "thunder",
		pattern: /^(thunder:(?:\/{1,3})[A-Za-z0-9\+\/=]*)/gm,

		emitter: function(text, match, prev) {
			var matches = text.match(this.pattern);

			if (matches) {
				var url = matches[0],
					display = url;

				if (url.match(/\]\[\d$/)) {
					return;
				}

				if (url.match(/\(thunder/)) {
					return;
				}

				return [display.length, ["a", {
						"href": url,
						"class": "p2p-link thunder"
					},
					display
				]];
			}
			return;
		}
	};

	var magnetLinkLexicon = {
		start: "magnet",
		pattern: /^(magnet:\?(?:[^\s()<>]+|\([^\s()<>]+\))+(?:\([^\s()<>]+\)|[^`!()\[\]{};:'".,<>?«»“”‘’\s]))/gm,

		emitter: function(text, match, prev) {
			var matches = text.match(this.pattern);

			if (matches) {
				var url = matches[0],
					display = url;

				if (url.match(/\]\[\d$/)) {
					return;
				}

				if (url.match(/\(magnet/)) {
					return;
				}

				return [display.length, ["a", {
						"href": url,
						"class": "p2p-link magnet"
					},
					display
				]];
			}
			return;
		}
	};

	var bareLinkLexicon = {
		start: ["http", "ftp", "www"],
		//pattern: /^((?:https?|ftps?):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?/igm.source,
		pattern: /^((?:(?:https?|ftps?):(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.])(?:[^\s()<>]+|\([^\s()<>]+\))+(?:\([^\s()<>]+\)|[^`!()\[\]{};:'".,<>?«»“”‘’\s]))/gm,

		emitter: function(text, match, prev) {
			var matches = text.match(this.pattern);

			if (matches) {
				var url = matches[0],
					display = url;

				if (url.match(/\]\[\d$/)) {
					return;
				}

				if (url.match(/\(http/)) {
					return;
				}

				if (url.match(/^www/)) {
					url = "http://" + url;
				}
				return [display.length, ["a", {
						href: url
					},
					display
				]];
			}
			return;
		}
	};

	var enclosedLinkLexicon = {
		start: "{",
		pattern: /^((?:https?|ftps?):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?/igm,

		emitter: function(text, match, prev) {
			var matches = text.match(this.pattern);

			if (matches) {
				var url = matches[0],
					display = url;
			}
			return;
		}
	};

	var InlineAutoLinkLexicons = {
		lexicons: [
			bareLinkLexicon
			// magnetLinkLexicon,
			// thunderLinkLexicon,
			// ed2kLinkLexicon
		],

		register: function(dialect) {
			var lexicons = this.lexicons;
			for (var i in lexicons) {
				var lexicon = lexicons[i];
				lexicon.dialect = dialect;
				dialect.inline[lexicon.start] = lexicon.emitter;
			}
		}
	};

	module.exports = InlineAutoLinkLexicons;



  var InlineLineBreakLexicon = {
    alias: 'linebreak',
    start: '\n',

    emitter: function(text, match, prev) {
      return [1, ["linebreak"]];
    },

    register: function(dialect) {
      var lexicon = this;
      lexicon.dialect = dialect;
      dialect.inline[lexicon.start] = function(text) {
        return lexicon.emitter(text);
      };
    }
  };



	var highlightLexicon = {
		between: "*",
		wordBoundary: true,
		emitter: function(contents) {
			if (contents.toString() === "")
				return;
			return ['em'].concat(contents);
		}
	};
	var strongLexicon = {
		between: "**",
		wordBoundary: true,
		emitter: function(contents) {
			if (contents.toString() === "")
				return;
			return ['strong'].concat(contents);
		}
	};
	var strongHighlightLexicon = {
		between: "***",
		wordBoundary: true,
		emitter: function(contents) {
			if (contents.toString() === "")
				return;
			return ['strong', ['em'].concat(contents)];
		}
	};
	var italicsLexicon = {
		between: '//',
		wordBoundary: true,
		emitter: function(contents) {
			if (contents.toString() === "")
				return;
			return ['i'].concat(contents);
		}
	};
	var insLexicon = {
		between: '__',
		wordBoundary: true,
		emitter: function(contents) {
			if (contents.toString() === "")
				return;
			return ['ins'].concat(contents);
		}
	};
	var delLexicon = {
		between: '~~',
		wordBoundary: true,
		emitter: function(contents) {
			if (contents.toString() === "")
				return;
			return ['del'].concat(contents);
		}
	};

	var InlineEmphasisLexicon = {
		alias: "inline_emphasis",
		lexicons: [
			strongHighlightLexicon,
			strongLexicon,
			highlightLexicon,
			italicsLexicon,
			insLexicon,
			delLexicon
		],

		register: function(dialect) {
			var lexicons = this.lexicons;
			for (var name in this.lexicons) {
				var lexicon = this.lexicons[name];
				lexicon.dialect = dialect;
				dialect.inlineBetween({
					between: lexicon.between,
					wordBoundary: lexicon.wordBoundary,
					emitter: lexicon.emitter
				});
			}
		}
	};



  var DEFAULT_MODIFIER_KEY_PATTERNS = {
    "esc": [
      /^(\s*(?:Esc|Escape|退出)[键符]?\s*)$/i,
      "Esc", {
        "class": "modifier-key esc"
      }
    ],
    "f1f12": function(contents) {
      var matched = contents.match(/^(\s*(F1[0-2]|F[1-9])[键符]?\s*)$/i);
      if (matched) {
        var result = [
          {"class": "modifier-key function " + matched[0].toLowerCase().trim()},
          matched[0].toUpperCase().trim()
        ];
        return result;
      }
    },
    "fn": [
      /^(\s*(?:Fn|功能)[键符]?\s*)$/i,
      "Fn", {
        "class": "modifier-key function fn"
      }
    ],


    "print-screen": [
      /^(\s*(?:Print|Print\s*Screen|Prnt\s*Scrn|打印|打印屏幕|截屏)[键符]?\s*)$/i,
      "Print Screen", {
        "class": "modifier-key print-screen"
      }
    ],
    "sys-req": [
      /^(\s*(?:System\s*Request|Sys\s*Req|Sys|System|系统)[键符]?\s*)$/i,
      "Sys Req", {
        "class": "modifier-key sys-req"
      }
    ],
    "scroll-lock": [
      /^(\s*(?:Scroll|Scroll\s*Lock|Scr\s*Lock|Scr\s*Lck|Scr\s*Lk|滚屏|滚屏锁定)[键符]?\s*)$/i,
      "Scroll Lock", {
        "class": "modifier-key scroll-lock"
      }
    ],
    "pause": [
      /^(\s*(?:Pause|Break|暂停)[键符]?\s*)$/i,
      "Pause/Break", {
        "class": "modifier-key pause-break"
      }
    ],
    "number-lock": [
      /^(\s*(?:Number\s*Lock|Num\s*Lock|Num\s*Lck|Num\s*Lk|数字锁定)[键符]?\s*)$/i,
      "Num Lock", {
        "class": "modifier-key num-lock"
      }
    ],

    "insert": [
      /^(\s*(?:Insert|Ins|插入)[键符]?\s*)$/i,
      "Insert", {
        "class": "modifier-key insert"
      }
    ],
    "delete": [
      /^(\s*(?:Delete|Del|删除)[键符]?\s*)$/i,
      "Delete", {
        "class": "modifier-key delete"
      }
    ],
    "home": [
      /^(\s*Home[键符]?\s*)$/i,
      "Home", {
        "class": "modifier-key home"
      }
    ],
    "end": [
      /^(\s*End[键符]?\s*)$/i,
      "End", {
        "class": "modifier-key end"
      }
    ],
    "page-up": [
      /^(\s*(?:Page\s*Up|Pg\s*Up|上翻页|上页)[键符]?\s*)$/i,
      "Page Up", {
        "class": "modifier-key page-up"
      }
    ],
    "page-down": [
      /^(\s*(?:Page\s*Down|Pg\s*Down|下翻页|下页)[键符]?\s*)$/i,
      "Page Down", {
        "class": "modifier-key page-down"
      }
    ],

    //&#8633;
    "tab": [
      /^(\s*(?:Tab|制表|表格|[↔⇄↹⇋⇌])[键符]?\s*)$/i,
      "Tab", {
        "class": "modifier-key tab"
      }
    ],
    "capslock": [
      /^(\s*(?:大小写|大小写切换|大小写锁定|Caps|Caps\s*Lock)[键符]?\s*)$/i,
      "Caps Lock", {
        "class": "modifier-key caps-lock"
      }
    ],
    //&#8679;
    "shift": [
      /^(\s*(?:Shift|换挡)[键符]?\s*)$/i,
      "Shift", {
        "class": "modifier-key shift"
      }
    ],

    //\u2423
    "space": [
      /^(\s*(?:Space|Space\s*Bar|空格|_{3,})[键符]?\s*)$/i,
      "Space", {
        "class": "modifier-key space"
      }
    ],
    "space-blank": [
      /^(\s+)$/i,
      "Space", {
        "class": "modifier-key space"
      }
    ],
    //&#8676;
    "backspace": [
      /^(\s*(?:Backspace|回退|退格)[键符]?\s*)$/i,
      "Backspace", {
        "class": "modifier-key backspace"
      }
    ],
    //&#8629;
    "enter": [
      /^(\s*(?:Enter|Return|回车|换行)[键符]?\s*)$/i,
      "Enter", {
        "class": "modifier-key enter"
      }
    ],

    "windows-ctrl": [
      /^(\s*(?:Ctrl|Control|控制)[键符]?\s*)$/i,
      "Ctrl", {
        "class": "modifier-key win-ctrl"
      }
    ],
    "windows-alt": [
      /^(\s*(?:Alt|切换)[键符]?\s*)$/i,
      "Alt", {
        "class": "modifier-key win-alt"
      }
    ],
    "windows-start": [
      /^(\s*(?:Windows|Win|Start|开始|Windows命令|Win命令)[键符]?\s*)$/i,
      "Windows", {
        "class": "modifier-key win-start"
      }
    ],
    "windows-menu": [
      /^(\s*(?:Menu|菜单)[键符]?\s*)$/i,
      "Menu", {
        "class": "modifier-key win-menu"
      }
    ],
    //\u2318
    "mac-command": [
      /^(\s*(?:Command|Apple|Apple\s*Key|Mac命令|苹果命令|苹果|\\u2318)[键符]?\s*)$/i,
      "Command", {
        "class": "modifier-key mac-command"
      }
    ],
    //\u2325
    "mac-option": [
      /^(\s*(?:Option|选项|\\u2325)[键符]?\s*)$/i,
      "Option", {
        "class": "modifier-key mac-option"
      }
    ],


    "arrow-left": [
      /^(\s*(?:<<+|<[\-=]+)\s*|(?:\s*左(?:箭头|方向)?[键符]?\s*)|\s*Left[\s\-_]?(?:Arrow)?[键符]?\s*|\s*[《«←⇦↤⇤⇐⇠]+\s*)$/i,
      "\u2190", {
        "class": "modifier-key arrow-left arrow"
      }
    ],
    "arrow-right": [
      /^(\s*(?:>>+|[\-=]+>)\s*|(?:\s*右(?:箭头|方向)?[键符]?\s*)|\s*Right[\s\-_]?(?:Arrow)?[键符]?\s*|\s*[》»→⇨↦⇥⇒⇢]+\s*)$/i,
      "\u2192", {
        "class": "modifier-key arrow-right arrow"
      }
    ],
    "arrow-up": [
      /^(\s*\^\^+\s*|(?:\s*上(?:箭头|方向)?[键符]?\s*)|\s*Up[\s\-_]?(?:Arrow)?[键符]?\s*|\s*[↑⇧⤒↥⇑⇡]+\s*)$/i,
      "\u2191", {
        "class": "modifier-key arrow-up arrow"
      }
    ],
    "arrow-down": [
      /^(\s*vv+\s*|(?:\s*下(?:箭头|方向)?[键符]?\s*)|\s*Down[\s\-_]?(?:Arrow)?[键符]?\s*|\s*[↓⇩⤓↧⇓⇣]+\s*)$/i,
      "\u2193", {
        "class": "modifier-key arrow-down arrow"
      }
    ]
  };

  var InlineKeyStrokeLexicon = {
    modifier_key_patterns: DEFAULT_MODIFIER_KEY_PATTERNS,
    start: "[[",
    stop: "]]",
    wordBoundary: true,
    rawContents: true,

    emitter: function(contents) {
      if (contents === "") {
        return;
      }

      var patterns = DEFAULT_MODIFIER_KEY_PATTERNS;
      var result = null;

      if (this.dialect.options.modifier_key_patterns) {
        patterns = this.dialect.options.modifier_key_patterns;
      }

      for (var name in patterns) {
        var pattern = patterns[name];
        if (typeof pattern === "function") {
          var temp = pattern(contents);
          if (temp) {
            result = temp;
            break;
          }
        } else {
          if (contents.match(pattern[0])) {
            result = [pattern[2], pattern[1]];
            break;
          }
        }
      }

      result = result ? result : contents.trim();
      return ['kbd'].concat(result);
    },

    register: function(dialect) {
      var lexicon = this;
      lexicon.dialect = dialect;
      dialect.inlineBetween({
        start: lexicon.start,
        stop: lexicon.stop,
        rawContents: lexicon.rawContents,
        wordBoundary: lexicon.wordBoundary,
        emitter: lexicon.emitter
      });
    }
  };

  module.exports = InlineKeyStrokeLexicon;




  var InlineEmojiLexicon = {
    start: '[',
    stop: ']',
    wordBoundary: true,
    rawContents: true,

    emitter: function(contents) {
      var emojiLookup = this.dialect.options.emojiLookup;
      if (emojiLookup) {
        var emoji = emojiLookup(contents);
        if (emoji) {
          return ["img", emoji.attrs];
        } else {
          return ["span", {"class": "emoji not-found"}, InlineEmojiLexicon.start + contents + InlineEmojiLexicon.stop];
        }
      }
    },

    register: function(dialect) {
      var lexicon = this;
      lexicon.dialect = dialect;
      dialect.inlineBetween({
        start: lexicon.start,
        stop: lexicon.stop,
        rawContents: lexicon.rawContents,
        wordBoundary: lexicon.wordBoundary,
        emitter: lexicon.emitter
      });
    }
  };

  module.exports = InlineEmojiLexicon;

/**
  Supports Discourse's custom @mention syntax for calling out a user in a post.
  It will add a special class to them, and create a link if the user is found in a
  local map.
**/

  var InlineMentionLexicon = {
    start: '@',
    pattern: /^(@[a-zA-Z0-9\u4e00-\u9fa5][_.\-a-zA-Z0-9\u4e00-\u9fa5]{1,19})/m,
    wordBoundary: true,

    emitter: function(text, match, prev) {
      var matches = text.match(this.pattern);

      if (matches) {
        var username = matches[1],
            mentionLookup = this.dialect.options.mentionLookup;

        if (mentionLookup) {
          var users = mentionLookup(username.substr(1));
          if (users) {
            return [username.length, ["a",
              {'class': 'mention', href: users[0].permlink},
              username
            ]];
          } else {
            return [text.length, ["span", {"class": "mention not-found"}, text]];
          }
        }
      }
      return;
    },

    register: function(dialect) {
      var lexicon = this;
      lexicon.dialect = dialect;
      dialect.inline[lexicon.start] = function(text) {
        return lexicon.emitter(text);
      };
    }
  };

  module.exports = InlineMentionLexicon;



  var Lexicons = [
    BlockHeaderLexicon,
    BlockCodeLexicon,
    //BlockHorizontalRuleLexicon,
    BlockQuoteLexicon,
    BlockParagraphLexicon,

    InlineAutoQuoteLexicon,
    InlineAutoLinkLexicons,
    InlineLineBreakLexicon,
    InlineEmphasisLexicon,
    InlineKeyStrokeLexicon,
    InlineEmojiLexicon,
    InlineMentionLexicon
  ];


// Include all our dependencies and return the resulting library.


  var
    mk_block = Markdown.mk_block = LandmarkHelpers.mk_block,
    BaseDialect = Gruber,
    extract_attr = LandmarkHelpers.extract_attr,
    isArray = LandmarkHelpers.isArray,
    forEach = LandmarkHelpers.forEach,
    isEmpty = LandmarkHelpers.isEmpty,
    merge = LandmarkHelpers.merge,
    invalidBoundary = LandmarkHelpers.invalidBoundary;

  var LandmarkDialect = function(options) {
    this.block = {

    };
    this.inline = {
      __oneElement__: BaseDialect.inline.__oneElement__,
      __call__: BaseDialect.inline.__call__,
      //__escape__: /^\\[\\`\*_{}<>\[\]()#\+.!\-\/~]/,
      __escape__: /^\\[`\*\/\_~\[\]]/,

      "]": function() {},
      "}": function() {},

      "\\": BaseDialect.inline["\\"],
      "`": BaseDialect.inline["`"]
    };
    this.options = {
      lexicons: undefined,
      metionLookup: undefined
    };
    this.options = merge(options || {}, this.options);

    for (var i in Lexicons) {
      var lexicon = Lexicons[i];
      if (typeof this.options.lexicons === "undefined" || lexicon.alias in this.options.lexicons)
        lexicon.register(this);
    }
  };

  LandmarkDialect.prototype = {
    /**
      Registers an inline replacer function

      @method registerInline
      @param {String} start The token the replacement begins with
      @param {Function} fn The replacing function
    **/
    registerInline: function(start, fn) {
      this.inline[start] = fn;
    },


    /**
      The simplest kind of replacement possible. Replace a stirng token with JsonML.

      For example to replace all occurrances of :) with a smile image:

      ```javascript
        Discourse.Dialect.inlineReplace(':)', function (text) {
          return ['img', {src: '/images/smile.png'}];
        });

      ```

      @method inlineReplace
      @param {String} token The token we want to replace
      @param {Function} emitter A function that emits the JsonML for the replacement.
    **/
    inlineReplace: function(token, emitter) {
      this.registerInline(token, function() {});
    },

    /**
      Matches inline using a regular expression. The emitter function is passed
      the matches from the regular expression.

      For example, this auto links URLs:

      ```javascript
        Discourse.Dialect.inlineRegexp({
          matcher: /((?:https?:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.])(?:[^\s()<>]+|\([^\s()<>]+\))+(?:\([^\s()<>]+\)|[^`!()\[\]{};:'".,<>?«»“”‘’\s]))/gm,
          spaceBoundary: true,
          start: 'http',

          emitter: function(matches) {
            var url = matches[1];
            return ['a', {href: url}, url];
          }
        });
      ```

      @method inlineRegexp
      @param {Object} args Our replacement options
        @param {Function} [opts.emitter] The function that will be called with the contents and regular expresison match and returns JsonML.
        @param {String} [opts.start] The starting token we want to find
        @param {String} [opts.matcher] The regular expression to match
        @param {Boolean} [opts.wordBoundary] If true, the match must be on a word boundary
        @param {Boolean} [opts.spaceBoundary] If true, the match must be on a space boundary
    **/
    inlineRegexp: function(args) {
      this.registerInline(args.start, function(text, match, prev) {
        if (invalidBoundary(args, prev)) {
          return;
        }

        args.matcher.lastIndex = 0;
        var m = args.matcher.exec(text);
        if (m) {
          var result = args.emitter.call(this, m);
          if (result) {
            return [m[0].length, result];
          }
        }
      });
    },

    /**
      Handles inline replacements surrounded by tokens.

      For example, to handle markdown style bold. Note we use `concat` on the array because
      the contents are JsonML too since we didn't pass `rawContents` as true. This supports
      recursive markup.

      ```javascript

        Discourse.Dialect.inlineBetween({
          between: '**',
          wordBoundary: true.
          emitter: function(contents) {
            return ['strong'].concat(contents);
          }
        });
      ```

      @method inlineBetween
      @param {Object} args Our replacement options
        @param {Function} [opts.emitter] The function that will be called with the contents and returns JsonML.
        @param {String} [opts.start] The starting token we want to find
        @param {String} [opts.stop] The ending token we want to find
        @param {String} [opts.between] A shortcut for when the `start` and `stop` are the same.
        @param {Boolean} [opts.rawContents] If true, the contents between the tokens will not be parsed.
        @param {Boolean} [opts.wordBoundary] If true, the match must be on a word boundary
        @param {Boolean} [opts.spaceBoundary] If true, the match must be on a sppace boundary
    **/
    inlineBetween: function(args) {
      var start = args.start || args.between,
        stop = args.stop || args.between,
        startLength = start.length;

      this.registerInline(start, function(text, match, prev) {
        if (invalidBoundary(args, prev)) {
          return;
        }

        var endPos = text.indexOf(stop, startLength);
        if (endPos === -1) {
          return;
        }

        var between = text.slice(startLength, endPos);

        // If rawcontents is set, don't process inline
        if (!args.rawContents) {
          between = this.processInline(between);
        }

        var contents = args.emitter.call(this, between);
        if (contents) {
          return [endPos + stop.length, contents];
        }
      });
    },

    /**
      Registers a block for processing. This is more complicated than using one of
      the other helpers such as `replaceBlock` so consider using them first!

      @method registerBlock
      @param {String} the name of the block handler
      @param {Function} the handler

    **/
    registerBlock: function(name, handler) {
      this.block[name] = handler;
    },

    /**
      Replaces a block of text between a start and stop. As opposed to inline, these
      might span multiple lines.

      Here's an example that takes the content between `[code]` ... `[/code]` and
      puts them inside a `pre` tag:

      ```javascript
        Discourse.Dialect.replaceBlock({
          start: /(\[code\])([\s\S]*)/igm,
          stop: '[/code]',

          emitter: function(blockContents) {
            return ['p', ['pre'].concat(blockContents)];
          }
        });
      ```

      @method replaceBlock
      @param {Object} args Our replacement options
        @param {String} [opts.start] The starting regexp we want to find
        @param {String} [opts.stop] The ending token we want to find
        @param {Function} [opts.emitter] The emitting function to transform the contents of the block into jsonML

    **/
    replaceBlock: function(args) {
      this.registerBlock(args.start.toString(), function(block, next) {

        args.start.lastIndex = 0;
        var m = (args.start).exec(block);

        if (!m) {
          return;
        }

        var startPos = block.indexOf(m[0]),
          leading,
          blockContents = [],
          result = [],
          lineNumber = block.lineNumber;

        if (startPos > 0) {
          leading = block.slice(0, startPos);
          lineNumber += (leading.split("\n").length - 1);

          var para = ['p'];
          this.processInline(leading).forEach(function(l) {
            para.push(l);
          });

          result.push(para);
        }

        if (m[2]) {
          next.unshift(Markdown.mk_block(m[2], null, lineNumber + 1));
        }

        lineNumber++;


        var blockClosed = false;
        if (next.length > 0) {
          for (var i = 0; i < next.length; i++) {
            if (next[i].indexOf(args.stop) >= 0) {
              blockClosed = true;
              break;
            }
          }
        }

        if (!blockClosed) {
          if (m[2]) {
            next.shift();
          }
          return;
        }

        while (next.length > 0) {
          var b = next.shift(),
            blockLine = b.lineNumber,
            diff = ((typeof blockLine === "undefined") ? lineNumber : blockLine) - lineNumber,
            endFound = b.indexOf(args.stop),
            leadingContents = b.slice(0, endFound),
            trailingContents = b.slice(endFound + args.stop.length);

          if (endFound >= 0) {
            blockClosed = true;
          }
          for (var j = 1; j < diff; j++) {
            blockContents.push("");
          }
          lineNumber = blockLine + b.split("\n").length - 1;

          if (endFound !== -1) {
            if (trailingContents) {
              next.unshift(Markdown.mk_block(trailingContents.replace(/^\s+/, "")));
            }

            blockContents.push(leadingContents.replace(/\s+$/, ""));
            break;
          } else {
            blockContents.push(b);
          }
        }


        var emitterResult = args.emitter.call(this, blockContents, m, this.options);
        if (emitterResult) {
          result.push(emitterResult);
        }
        return result;
      });
    },

    /**
      After the parser has been executed, post process any text nodes in the HTML document.
      This is useful if you want to apply a transformation to the text.

      If you are generating HTML from the text, it is preferable to use the replacer
      functions and do it in the parsing part of the pipeline. This function is best for
      simple transformations or transformations that have to happen after all earlier
      processing is done.

      For example, to convert all text to upper case:

      ```javascript

        Discourse.Dialect.postProcessText(function (text) {
          return text.toUpperCase();
        });

      ```

      @method postProcessText
      @param {Function} emitter The function to call with the text. It returns JsonML to modify the tree.
    **/
    postProcessText: function(emitter) {
      this.emitters.push(emitter);
    },

    /**
      After the parser has been executed, change the contents of a HTML tag.

      Let's say you want to replace the contents of all code tags to prepend
      "EVIL TROUT HACKED YOUR CODE!":

      ```javascript
        Discourse.Dialect.postProcessTag('code', function (contents) {
          return "EVIL TROUT HACKED YOUR CODE!\n\n" + contents;
        });
      ```

      @method postProcessTag
      @param {String} tag The HTML tag you want to match on
      @param {Function} emitter The function to call with the text. It returns JsonML to modify the tree.
    **/
    postProcessTag: function(tag, emitter) {
      this.on('parseNode', function(event) {
        var node = event.node;
        if (node[0] === tag) {
          node[node.length - 1] = emitter(node[node.length - 1]);
        }
      });
    }
  };

  var Landmark = new LandmarkDialect();

  Markdown.dialects.Landmark = Landmark;
  Markdown.buildBlockOrder(Landmark.block);
  Markdown.buildInlinePatterns(Landmark.inline);




// Include all our dependencies and return the resulting library.



  expose.Landmark = Landmark;

})(exports);
