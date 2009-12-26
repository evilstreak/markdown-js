var Markdown = exports.Markdown = function Markdown(dialect) {
  this.references = { };
  this.dialect = dialect || Markdown.dialects.Gruber;
  this.em_state = [];
  this.strong_state = [];
  this.debug_indent = "";
}

var mk_block = Markdown.mk_block = function(block, trail) {
  // Be helpful for default case in tests.
  if ( arguments.length == 1 ) trail = "\n\n";

  var s = new String(block);
  s.trailing = trail;
  // To make it clear its not just a string
  s.toSource = function() {
    return "Markdown.mk_block( " +
            uneval(block) +
            ", " +
            uneval(trail) +
            " )"
  }
  return s;
}

Markdown.prototype.tabstop = 4;

// Internal - split source into rough blocks
Markdown.prototype.split_blocks = function splitBlocks( input ) {
  // [\s\S] matches _anything_ (newline or space)
  var re = /(?:\s*\n)?([\s\S]+?)($|\n(?:\s*\n|$)+)/g,
      blocks = [],
      m;

  var replace = "";
  while (replace.length < this.tabstop) { replace += " " }

  var tab_re = new RegExp("^((?:" + replace + ")*)?( {0,"+this.tabstop+"}\t)", "gm")
  while ( ( m = re(input) ) != null ) {
    var orig, replaced = m[1];

    // Replace leading tabs until we've got them all. We need to loop because of
    // anchor on the regex and wanting to only replace tabs in the indent, not
    // the body.
    do {
      orig = replaced;
      replaced = orig.replace(tab_re, "$1" + replace );
    } while (orig != replaced);

    blocks.push( mk_block( orig, m[2] ) );
  }

  return blocks;
}

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
 */
Markdown.prototype.processBlock = function processBlock( block, next ) {
  var cbs = this.dialect.block,
      ord = cbs.__order__;

  for ( var i = 0; i < ord.length; i++ ) {
    //D:this.debug( "Testing", ord[i] );
    var res = cbs[ ord[i] ].call( this, block, next );
    if ( res ) {
      //D:this.debug("  matched");
      if ( !res instanceof Array || !( res.length > 0 && res[0] instanceof Array ) )
        this.debug(" ", ord[i], "didn't return a proper array");
      //D:this.debug( "" );
      return res;
    }
  }

  // Uhoh! no match! Should we throw an error?
  return [];
}

Markdown.prototype.processInline = function processInline( block ) {
  return this.dialect.inline.__call__.call( this, String( block ) );
}

/**
 *  Markdown#toTree( source ) -> JsonML
 *  - source (String): markdown source to parse
 *
 *  Parse `source` into a JsonML tree representing the markdown document.
 **/
Markdown.prototype.toTree = function toTree( source ) {
  var blocks = this.split_blocks( source );

  // Make tree a member variable so its easier to mess with in extensions
  this.tree = this.tree || [ "markdown" ];

  blocks:
  while ( blocks.length ) {
    var b = this.processBlock( blocks.shift(), blocks );

    // Reference blocks and the like won't return any content
    if ( !b.length ) continue blocks;

    this.tree.push.apply( this.tree, b );
  }

  return this.tree;
}

// Noop by default
Markdown.prototype.debug = function () {
  var args = Array.prototype.slice.call( arguments);
  args.unshift(this.debug_indent);
  print.apply( print, args );
}

Markdown.prototype.loop_re_over_block = function( re, block, cb ) {
  // Dont use /g regexps with this
  var m,
      b = block.valueOf();

  while ( b.length && (m = re(b) ) != null) {
    b = b.substr( m[0].length );
    cb.call(this, m);
  }
  return b;
}

exports.toHTML = function toHTML( source ) {
  var input = this.toHTMLTree( source ),
      md = new Markdown;

  return require( "jsonml" ).render( input );
}

exports.toHTMLTree = function toHTMLTree( input ) {
  // convert string input to an MD tree
  if ( typeof input ==="string" ) input = this.parse( input );

  // convert the MD tree to an HTML tree
  return require( "jsonml" ).toHtml( input );
}

Markdown.dialects = {};
Markdown.dialects.Gruber = {
  block: {
    atxHeader: function atxHeader( block, next ) {
      var m = block.match( /^(#{1,6})\s*(.*?)\s*#*(?:\n\s*)*$/ );

      if ( !m ) return undefined;

      var header = [ "header", { level: m[ 1 ].length }, m[ 2 ] ];

      return [ header ];
    },

    setextHeader: function setextHeader( block, next ) {
      var m = block.match( /^(.*)\n([-=])\2\2+(?:\n\s*)*$/ );

      if ( !m ) return undefined;

      var level = ( m[ 2 ] === "=" ) ? 1 : 2;
      var header = [ "header", { level : level }, m[ 1 ] ];

      return [ header ];
    },

    horizRule: function horizRule( block, next) {
      if ( !block.match( /^([*-_])([ \t]*\1){2,}[ \t]*$/ ) )
        return undefined
      return [ [ "hr" ] ];
    },

    code: function code( block, next ) {
      // |    Foo
      // |bar
      // should be a code block followed by a paragraph. Fun
      //
      // There might also be adjacent code block to merge.

      var ret = [],
          re = /^[ ]{4}(.*)\n?/,
          lines;

      // 4 spaces + content
      var m = block.match( re );

      if ( !m ) return undefined;

      block_search:
      do {
        // Now pull out the rest of the lines
        var b = this.loop_re_over_block(
                  re, block.valueOf(), function( m ) { ret.push( m[1] ) } );

        if (b.length) {
          // Case alluded to in first comment. push it back on as a new block
          next.unshift( mk_block(b, block.trailing) );
          break block_search;
        }
        else if (next.length) {
          // Check the next block - it might be code too
          var m = next[0].match( re );

          if ( !m ) break block_search;

          // Pull how how many blanks lines follow - minus two to account for .join
          ret.push ( block.trailing.replace(/[^\n]/g, '').substring(2) );

          block = next.shift();
        }
        else
          break block_search;
      } while (true);

      return [ [ "code_block", ret.join("\n") ] ];
    },

    // There are two types of lists. Tight and loose. Tight lists have no whitespace
    // between the items (and result in text just in the <li>) and loose lists,
    // which have an empty line between list items, resulting in (one or more)
    // paragraphs inside the <li>.
    //
    // There are all sorts wierd edge cases about the original markdown.pl's
    // handling of lists:
    //
    // * Nested lists are supposed to be indented by four chars per level. But
    //   if they aren't, you can get a nested list by indenting by less than
    //   four so long as the indent doesn't match an the indent of an existing
    //   list item in the 'nest stack'.
    //
    // * The type of the list (bullet or number) is controled just by the first
    //   item at the indent. subsjent changes are ignored unless they are for
    //   nested lists
    //
    lists: (function( ) {
      // Use a closure to hide a few variables.
      var any_list = "[*+-]|\\d\\.",
          bullet_list = /[*+-]/,
          number_list = /\d+\./,
          // Capture leading indent as it matters for determining nested lists.
          is_list_re = new RegExp( "^( {0,3})(" + any_list + ")[ \t]+" );

      // Create a regexp suitable for matching an li for a given stack depth
      function regex_for_depth(indent, depth) {
        depth++; // Match a list one deeper than the current depth


        return new RegExp(
          "(?:^( {0," + ((depth*4)-1) + "})(" + any_list + ")\\s+)|" + // m[1],m[2]
          "(^(?:[ ]{4}){0," + (depth-2) + "}[ ]{0,4})"                 // m[3]
        );

      }

      // The matcher function
      return exports.b = function( block, next ) {
        var m = block.match( is_list_re );
        if ( !m ) return undefined;

        function make_list( m ) {
          var list = bullet_list( m[2] )
                   ? ["bulletlist"]
                   : ["numberlist"];

          stack.push( { list: list, indent: m[1] } );
          return list;
        }


        var stack = [], // Stack of lists for nesting.
            list = make_list( m ),
            last_li,
            inner_blocks = [],
            indent = m[1],
            prev_indent = indent.length,
            loose = false;

        // Loop to search over block looking for inner block elements and loose lists
        loose_search:
        do {
          // Split into lines preserving new lines at end of line
          var lines = block.split( /(?=\n)/ );

          // Loop over the lines in this block looking for tight lists.
          tight_search:
          for (var i=0; i < lines.length; i++) {
            var nl = "",
                l = lines[i].replace(/^\n/, function(n) { nl = n; return "" });

            // TODO: really should cache this
            var line_re = regex_for_depth( indent, stack.length );

            m = l.match( line_re );
            //print( "line:", uneval(l), "\nline match:", uneval(m) );

            // We have a list item
            if ( m[1] !== undefined ) {
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
                // stack, put it there, put it one deeper then the wanted_depth
                // deserves.
                var found = stack.some(function(s, i) {
                  if (s.indent != m[1]) return false;
                  list = s.list;     // Found the level we want
                  stack.splice(i+1); // Remove the others
                  //print("found");
                  return true;       // And stop looping
                });

                if (!found) {
                  //print("not found. l:", uneval(l));
                  wanted_depth++;
                  if (wanted_depth <= stack.length) {
                    stack.splice(wanted_depth);
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
              prev_indent = m[1].length;
            }
            else {
              // Continuation line.
              //  Supress \n when previous line was empty
              if (last_li.length == 1)nl = "";
            }

            // Add content
            if (l.length > m[0].length) {

              var cont = nl + l.substr( m[0].length );
              if (loose) {
                last_li.push( [ "para", cont ] );
                loose = false;
              }
              else if (last_li.length == 1 || typeof last_li[last_li.length-1] != "string")
                last_li.push( cont );
              else
                last_li[last_li.length-1] += cont;
            }
          } // tight_search

          // Look at the next block - we might have a loose list. or an extra
          // paragraph for the current li
          var next_block = next[0] && next[0].valueOf() || "";

          if ( next_block.match(is_list_re) || next_block.match( /^ / ) ) {
            block = next.shift();

            // Make sure all listitems up the stack are paragraphs
            stack.forEach( function(s, i) {
              var list = s.list;
              var last_li = list[list.length-1];
              // TODO: this might need to call processBlock on the content!
              if (i+1 == stack.length) {
                // Last stack frame
                last_li.push( ["para"].concat( last_li.splice(1) ) );
              }
              else {
                var sublist = last_li.pop();
                last_li.push( ["para"].concat( last_li.splice(1) ), sublist );
              }
            });

            loose = true;
            continue loose_search;
          }
          break;
        } while( true ); // loose_search

        return [ stack[0].list ];
      }
    })(),

    blockquote: function blockquote( block, next ) {
      if ( block[0] != ">" )
        return undefined;

      // Strip off the leading "> " and re-process as a block.
      var input =  block.replace( /^> ?/gm, ''),
          old_tree = this.tree;

      try {
        this.tree = [ "blockquote" ];
        return [ this.toTree(input) ];
      }
      finally {
        this.tree = old_tree;
      }
    },

    referenceDefn: function referenceDefn( block, next) {
      var re = /^\s*\[(.*?)\]:\s*<?(\S+)>?(?:\s+(?:(['"])(.*?)\3|\((.*?)\)))?\n?/;
      // interesting matches are [ , ref_id, url, , title, title ]

      if ( !block.match(re) )
        return undefined;

      var b = this.loop_re_over_block(re, block, function( m ) {
        var ref = this.references[ m[1].toLowerCase() ] = {
          href: m[2],
        };

        if (m[4] !== undefined)
          ref.title = m[4];
        else if (m[5] !== undefined)
          ref.title = m[5];

      } );

      if (b.length)
        next.unshift( mk_block( b, block.trailing ) );

      return [];
    },

    para: function para( block, next ) {
      // everything's a para!
      return [ ["para"].concat( this.processInline( block ) ) ];
    }
  }
}

Markdown.dialects.Gruber.inline = {
    __call__: function inline( text, patterns ) {
      // Hmmm - should this function be directly in Md#processInline, or
      // conversely, should Md#processBlock be moved into block.__call__ too
      var out = [ ],
          m,
          // Look for the next occurange of a special character/pattern
          re = new RegExp( "([\\s\\S]*?)(" + patterns + ")", "g" ),
          lastIndex = 0;

      //D:var self = this;
      //D:self.debug("processInline:", uneval(text) );
      function add(x) {
        //D:self.debug("  adding output", uneval(x));
        if (typeof x == "string" && typeof out[out.length-1] == "string")
          out[ out.length-1 ] += x;
        else
          out.push(x);
      }

      while ( ( m = re.exec(text) ) != null) {
        if ( m[1] ) add( m[1] ); // Some un-interesting text matched
        else        m[1] = { length: 0 }; // Or there was none, but make m[1].length == 0

        var res;
        if ( m[2] in this.dialect.inline ) {
          res = this.dialect.inline[ m[2] ].call(
                    this,
                    text.substr( m.index + m[1].length ), m );
        }
        // Default for now to make dev easier. just slurp speacial and output it.
        res = res || [ m[2].length, m[2] ];

        var len = res.shift();
        // Update how much input was consumed
        re.lastIndex += ( len - m[2].length );

        // Add children
        res.forEach(add);

        lastIndex = re.lastIndex;
      }

      // Add last 'boring' chunk
      if ( text.length > lastIndex )
        add( text.substr( lastIndex ) );

      return out;
    },

    "\\": function escaped( text ) {
      // [ length of input processed, node/children to add... ]
      // Only esacape: \ ` * _ { } [ ] ( ) # * + - . !
      if ( text.match( /^\\[\\`\*_{}\[\]()#\+.!\-]/ ) )
        return [ 2, text[1] ];
      else
        // Not an esacpe
        return [ 1, "\\" ];
    },

    "![": function image( text ) {
    },

    "[": function link( text ) {
    },


    "<": function autoLink( text ) {
    },

    "`": function inlineCode( text ) {
      // Inline code block. as many backticks as you like to start it
      // Always skip over the opening ticks.
      var m = text.match( /(`+)((.*?)\1)/ );

      if ( m[2] )
        return [ m[1].length + m[2].length, [ "inlinecode", m[3] ] ];
      else {
        // TODO: No matching end code found - warn!
        return [ m[1].length, m[1] ];
      }
    },

    "  \n": function lineBreak( text ) {
      return [ 3, [ "linebreak" ] ];
    }

}

// Meta Helper/generator method for em and strong handling
function strong_em( tag, md ) {

  var state_slot = tag + "_state",
      other_slot = tag == "strong" ? "em_state" : "strong_state";

  function CloseTag(len) {
    this.len_after = len;
    this.name = "close_" + md;
  }

  return function ( text, orig_match ) {

    if (this.em_state[0] == md) {
      // Most recent em is of this type
      //D:this.debug("closing", md);
      this[state_slot].shift();

      // "Consume" everything to go back to the recrusion in the else-block below
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
      if (last instanceof CloseTag) {
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
  } // End returned function
}

Markdown.dialects.Gruber.inline["**"] = strong_em("strong", "**");
Markdown.dialects.Gruber.inline["__"] = strong_em("strong", "__");
Markdown.dialects.Gruber.inline["*"]  = strong_em("em", "*");
Markdown.dialects.Gruber.inline["_"]  = strong_em("em", "_");

// Build default order from insertion order.
(function(d) {

  var ord = [];
  for (i in d) ord.push( i );
  d.__order__ = ord;

})( Markdown.dialects.Gruber.block );

// Build patterns for inline matcher
(function(d) {
  var patterns = [];

  for (i in d) {
    if (i == "__call__") continue;
    var l = i.replace( /([\\.*+?|()\[\]{}])/g, "\\$1" );
    patterns.push( i.length == 1 ? l : "(?:" + l + ")" );
  }

  patterns = patterns.join("|");
  //print("patterns:", uneval( patterns ) );

  var fn = d.__call__;
  d.__call__ = function(text, pattern) {
    if (pattern != undefined)
      return fn.call(this, text, pattern);
    else
      return fn.call(this, text, patterns);
  }
})( Markdown.dialects.Gruber.inline );

exports.parse = function( source ) {
  var md = new Markdown();
  return md.toTree( source );
}

var tests = {
  meta: function(fn) {
    return function() { fn( new Markdown ) }
  }
};

tests = {
  test_split_block: tests.meta(function(md) {
    asserts.same(
        md.split_blocks( "# h1 #\n\npara1\npara1L2\n  \n\n\n\npara2\n" ),
        [mk_block( "# h1 #", "\n\n" ),
         mk_block( "para1\npara1L2", "\n  \n\n\n\n" ),
         mk_block( "para2", "\n" )
        ],
        "split_block should record trailing newlines");

    asserts.same(
        md.split_blocks( "\n\n# heading #\n\npara\n" ),
        [mk_block( "# heading #", "\n\n" ),
         mk_block( "para", "\n" )
        ],
        "split_block should ignore leading newlines");
  }),

  test_headers: tests.meta(function(md) {
    var h1 = md.dialect.block.atxHeader( "# h1 #\n\n", [] ),
        h2;

    asserts.same(
      h1,
      md.dialect.block.setextHeader( "h1\n===\n\n", [] ),
      "Atx and Setext style H1s should produce the same output" );

    asserts.same(
      md.dialect.block.atxHeader("# h1\n\n"),
      h1,
      "Closing # optional on atxHeader");

    asserts.same(
      h2 = md.dialect.block.atxHeader( "## h2\n\n", [] ),
      [["header", {level: 2}, "h2"]],
      "Atx h2 has right level");

    asserts.same(
      h2,
      md.dialect.block.setextHeader( "h2\n---\n\n", [] ),
      "Atx and Setext style H2s should produce the same output" );

  }),

  test_code: tests.meta(function(md) {
    var code = md.dialect.block.code,
        next = [ mk_block("next") ];

    asserts.same(
      code.call( md, mk_block("    foo\n    bar"), next ),
      [["code_block", "foo\nbar" ]],
      "Code block correct");

    asserts.same(
      next, [mk_block("next")],
      "next untouched when its not code");

    next = [];
    asserts.same(
      code.call( md, mk_block("    foo\n  bar"), next ),
      [["code_block", "foo" ]],
      "Code block correct for abutting para");

    asserts.same(
      next, [mk_block("  bar")],
      "paragraph put back into next block");

    asserts.same(
      code.call( md, mk_block("    foo"), [mk_block("    bar"), ] ),
      [["code_block", "foo\n\nbar" ]],
      "adjacent code blocks ");

    asserts.same(
      code.call( md, mk_block("    foo","\n  \n      \n"), [mk_block("    bar"), ] ),
      [["code_block", "foo\n\n\nbar" ]],
      "adjacent code blocks preserve correct number of empty lines");

  }),

  test_bulletlist: tests.meta(function(md) {
    var bl = md.dialect.block.lists;

    asserts.same(
      bl( mk_block("* foo\n* bar"), [] ),
      [ [ "bulletlist", [ "listitem", "foo" ], [ "listitem", "bar" ] ] ],
      "single line bullets");

    asserts.same(
      bl( mk_block("* foo\nbaz\n* bar\nbaz"), [] ),
      [ [ "bulletlist", [ "listitem", "foo\nbaz" ], [ "listitem", "bar\nbaz" ] ] ],
      "multiline lazy bullets");

    asserts.same(
      bl( mk_block("* foo\n  baz\n* bar\n  baz"), [] ),
      [ [ "bulletlist", [ "listitem", "foo\nbaz" ], [ "listitem", "bar\nbaz" ] ] ],
      "multiline tidy bullets");

    asserts.same(
      bl( mk_block("* foo\n     baz"), [] ),
      [ [ "bulletlist", [ "listitem", "foo\n baz" ] ] ],
      "only trim 4 spaces from the start of the line");

    /* Test wrong: should end up with 3 nested lists here
    asserts.same(
      bl( mk_block(" * one\n  * two\n   * three" ), [] ),
      [ [ "bulletlist", [ "listitem", "one" ], [ "listitem", "two" ], [ "listitem", "three" ] ] ],
      "bullets can be indented up to three spaces");
    */

    asserts.same(
      bl( mk_block("  * one"), [ mk_block("    two") ] ),
      [ [ "bulletlist", [ "listitem", [ "para", "one" ], [ "para", "two" ] ] ] ],
      "loose bullet lists can have multiple paragraphs");

    /* Case: no space after bullet - not a list
     | *↵
     |foo
     */
    asserts.same(
      bl( mk_block(" *\nfoo") ),
      undefined,
      "Space required after bullet to trigger list");

    /* Case: note the space after the bullet
     | *␣
     |foo
     |bar
     */
    asserts.same(
      bl( mk_block(" * \nfoo\nbar"), [ ] ),
      [ [ "bulletlist", [ "listitem", "foo\nbar" ] ] ],
      "space+continuation lines");


    /* Case I:
     | * foo
     |     * bar
     |   * baz
     */
    asserts.same(
      bl( mk_block(" * foo\n" +
                   "      * bar\n" +
                   "    * baz"),
          [] ),
      [ [ "bulletlist",
          [ "listitem",
            "foo",
            [ "bulletlist",
              [ "listitem",
                "bar",
                [ "bulletlist",
                  [ "listitem", "baz" ]
                ]
              ]
            ]
          ]
      ] ],
      "Interesting indented lists I");

    /* Case II:
     | * foo
     |      * bar
     | * baz
     */
    asserts.same(
      bl( mk_block(" * foo\n      * bar\n * baz"), [] ),
      [ [ "bulletlist",
          [ "listitem",
            "foo",
            [ "bulletlist",
              [ "listitem", "bar" ]
            ]
          ],
          [ "listitem", "baz" ]
      ] ],
      "Interesting indented lists II");

    /* Case III:
     |  * foo
     |   * bar
     |* baz
     | * fnord
     */
    asserts.same(
      bl( mk_block("  * foo\n   * bar\n* baz\n * fnord"), [] ),
      [ [ "bulletlist",
          [ "listitem",
            "foo",
            [ "bulletlist",
              [ "listitem", "bar" ],
              [ "listitem", "baz" ],
              [ "listitem", "fnord" ]
            ]
          ]
      ] ],
      "Interesting indented lists III");

    /* Case IV:
     | * foo
     |
     | 1. bar
     */
    asserts.same(
      bl( mk_block(" * foo"), [ mk_block(" 1. bar\n") ] ),
      [ [ "bulletlist",
          ["listitem", ["para", "foo"] ],
          ["listitem", ["para", "bar"] ]
      ] ],
      "Different lists at same indent IV");

    /* Case V:
     |   * foo
     |  * bar
     | * baz
     */
    asserts.same(
      bl( mk_block("   * foo\n  * bar\n * baz"), [] ),
      [ [ "bulletlist",
          [ "listitem",
            "foo",
            [ "bulletlist",
              ["listitem", "bar"],
              ["listitem", "baz"],
            ]
          ]
      ] ],
      "Indenting Case V")

    /* Case VI: deep nesting
     |* one
     |    * two
     |        * three
     |            * four
     */
    asserts.same(
      bl( mk_block("* one\n    * two\n        * three\n            * four"), [] ),
      [ [ "bulletlist",
          [ "listitem",
            "one",
            [ "bulletlist",
              [ "listitem",
                "two",
                [ "bulletlist",
                  [ "listitem",
                    "three",
                    [ "bulletlist",
                      [ "listitem", "four" ]
                    ]
                  ]
                ]
              ]
            ]
          ]
      ] ],
      "deep nested lists VI")

    /* Case VII: This one is just fruity!
     |   * foo
     |  * bar
     | * baz
     |* HATE
     |  * flibble
     |   * quxx
     |    * nest?
     */
    asserts.same(
      bl( mk_block("   * foo\n" +
                   "  * bar\n" +
                   " * baz\n" +
                   "* HATE\n" +
                   "  * flibble\n" +
                   "   * quxx\n" +
                   "    * nest?\n" +
                   "        * where\n" +
                   "      * am\n" +
                   "     * i?"),
        [] ),
      [ [ "bulletlist",
          [ "listitem",
            "foo",
            [ "bulletlist",
              ["listitem", "bar"],
              ["listitem", "baz"],
              ["listitem", "HATE"],
              ["listitem", "flibble"]
            ]
          ],
          [ "listitem",
            "quxx",
            [ "bulletlist",
              [ "listitem",
                "nest?",
                [ "bulletlist",
                  ["listitem", "where"],
                  ["listitem", "am"],
                  ["listitem", "i?"]
                ]
              ]
            ]
          ]
      ] ],
      "Indenting Case VII");

    /* Case VIII: Deep nesting + code block
     |   * one
     |    * two
     |        * three
     |                * four
     |
     |                foo
     */
    asserts.same(
      bl( mk_block("   * one\n" +
                   "    1. two\n" +
                   "        * three\n" +
                   "                * four",
                   "\n\n"),
          [ mk_block("                foo") ] ),
      [ [ "bulletlist",
          [ "listitem",
            ["para", "one"],
            [ "numberlist",
              [ "listitem",
                ["para", "two"],
                [ "bulletlist",
                  [ "listitem",
                    [ "para", "three\n    *four"],
                    ["codeblock", "foo"]
                  ]
                ]
              ]
            ]
          ]
      ] ],
      "Case VIII: Deep nesting and code block");

  }),

  test_horizRule: tests.meta(function(md) {
    var hr = md.dialect.block.horizRule,
        strs = ["---", "_ __", "** ** **", "--- "];
    strs.forEach( function(s) {
      asserts.same(
        hr.call( md, mk_block(s), [] ),
        [ [ "hr" ] ],
        "simple hr from " + uneval(s));
    });
  }),

  test_blockquote: tests.meta(function(md) {
    var bq = md.dialect.block.blockquote;
    asserts.same(
      bq.call( md, mk_block("> foo\n> bar"), [] ),
      [ ["blockquote", ["para", "foo\nbar"] ] ],
      "simple blockquote");

    // Note: this tests horizRule as well through block processing.
    asserts.same(
      bq.call( md, mk_block("> foo\n> bar\n>\n>- - - "), [] ),
      [ ["blockquote",
          ["para", "foo\nbar"],
          ["hr"]
      ] ],
      "blockquote with intersting content");

  }),

  test_referenceDefn: tests.meta(function(md) {
    var rd = md.dialect.block.referenceDefn;

    [ '[id]: http://example.com/  "Optional Title Here"',
      "[id]: http://example.com/  'Optional Title Here'",
      '[id]: http://example.com/  (Optional Title Here)'
    ].forEach( function(s) {
      asserts.same( rd.call( md, mk_block(s) ), [], "ref processed");

      asserts.same(md.references,
                   { "id": { href: "http://example.com/", title: "Optional Title Here" } },
                   "reference extracted");

      md.references = {}; // Clear for next run
    });

    // Check a para abbuting a ref works right
    var next = [];
    asserts.same( rd.call( md, mk_block("[id]: example.com\npara"), next ), [], "ref processed");
    asserts.same(md.references, { "id": { href: "example.com" } }, "reference extracted");
    asserts.same(next, [ mk_block("para") ], "paragraph put back into blocks");

  }),

  test_inline: tests.meta(function(md) {
    asserts.same(
      md.processInline("foo  \n\\[bar"),
      [ "foo", ["linebreak"], "[bar" ], "linebreak+escpae");

    asserts.same( md.processInline("\\bar"), [ "\\bar" ], "invalid escape" );

    asserts.same( md.processInline("`bar`"), [ ["inlinecode", "bar" ] ], "code I" );
    asserts.same( md.processInline("``b`ar``"), [ ["inlinecode", "b`ar" ] ], "code II" );
    asserts.same( md.processInline("```bar``` baz"), [ ["inlinecode", "bar" ], " baz" ], "code III" );

    // Yay for horrible edge cases >_<
    asserts.same( md.processInline("foo *abc* bar"), [ "foo ", ["em", "abc" ], " bar" ], "strong/em I" );
    asserts.same( md.processInline("*abc `code`"), [ "*abc ", ["inlinecode", "code" ] ], "strong/em II" );
    asserts.same( md.processInline("*abc**def* after"), [ ["em", "abc**def" ], " after" ], "strong/em III" );
    asserts.same( md.processInline("*em **strong * wtf**"), [ ["em", "em **strong " ], " wtf**" ], "strong/em IV" );
    asserts.same( md.processInline("*foo _b*a*r baz"), [ [ "em", "foo _b" ], "a*r baz" ], "strong/em V" );
  })
}

if (require.main === module) {
  if ( require('system').args[1] === "--test") {
    var asserts = require('test').asserts;
    require('test').runner(tests);
  } else {
    try {
      print( uneval( exports.parse("# h1 #\n\npara1\n\nsetext h2\n---------para2\n") ) );
    }
    catch (e) {
      print(e);
      print(e.stack);
      quit(1);
    }
  }
}













