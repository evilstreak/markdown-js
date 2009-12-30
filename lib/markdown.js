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

  while ( ( m = re(input) ) != null ) {
    blocks.push( mk_block( m[1], m[2] ) );
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
// custom_tree means set this.tree to `custom_tree` and restore old value on return
Markdown.prototype.toTree = function toTree( source, custom_root ) {
  var blocks = this.split_blocks( source );

  // Make tree a member variable so its easier to mess with in extensions
  var old_tree = this.tree;
  try {
    this.tree = custom_root || this.tree || [ "markdown" ];

    blocks:
    while ( blocks.length ) {
      var b = this.processBlock( blocks.shift(), blocks );

      // Reference blocks and the like won't return any content
      if ( !b.length ) continue blocks;

      this.tree.push.apply( this.tree, b );
    }
    return this.tree;
  }
  finally {
    if ( custom_root )
      this.tree = old_tree;
  }

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
          re = /^(?: {0,3}\t| {4})(.*)\n?/,
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
          is_list_re = new RegExp( "^( {0,3})(" + any_list + ")[ \t]+" ),
          indent_re = "(?: {0,3}\\t| {4})";

      // TODO: Cache these two regexps for certain depths.
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

      // The matcher function
      return function( block, next ) {
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
            loose = false;

        // Loop to search over block looking for inner block elements and loose lists
        loose_search:
        while( true ) {
          // Split into lines preserving new lines at end of line
          var lines = block.split( /(?=\n)/ );

          // Loop over the lines in this block looking for tight lists.
          tight_search:
          for (var line_no=0; line_no < lines.length; line_no++) {
            var nl = "",
                l = lines[line_no].replace(/^\n/, function(n) { nl = n; return "" });

            // TODO: really should cache this
            var line_re = regex_for_depth( stack.length );

            m = l.match( line_re );
            //print( "line:", uneval(l), "\nline match:", uneval(m) );

            // We have a list item
            if ( m[1] !== undefined ) {
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
                var found = stack.some(function(s, i) {
                  if ( s.indent != m[1] ) return false;
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
            }
            else {
              // Continuation line.
              //  Supress \n when previous line was empty
              if (last_li.length == 1)nl = "";
            }

            // Add content
            if (l.length > m[0].length) {

              var cont = nl + this.processInline( l.substr( m[0].length ) );
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
                var tree = this.toTree(last_li.splice(1), [] );
                // Keep the same array, but replace the contents
                last_li.push.apply(last_li, tree);
              }
              else {
                var sublist = last_li.pop();
                last_li.push( ["para"].concat( last_li.splice(1) ), sublist );
              }
            }, this);

            loose = true;
            continue loose_search;
          }
          break;
        } // loose_search

        return [ stack[0].list ];
      }
    })(),

    blockquote: function blockquote( block, next ) {
      if ( block[0] != ">" )
        return undefined;

      // Strip off the leading "> " and re-process as a block.
      var input =  block.replace( /^> ?/gm, ''),
          old_tree = this.tree;

      return [ this.toTree( input, [ "blockquote" ] ) ];
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
      // ![Alt text](/path/to/img.jpg "Optional title")
      //      1          2            3       4         <--- captures
      var m = text.match( /^!\[(.*?)\][ \t]*\([ \t]*(\S+)(?:[ \t]+(["'])(.*?)\3)?[ \t]*\)/ );

      if ( m ) {
        var attrs = { alt: m[1], href: m[2] };
        if ( m[4] !== undefined)
          attrs.title = m[4];

        return [ m[0].length, [ "img", attrs ] ];
      }

      // ![Alt text][id]
      m = text.match( /^!\[(.*?)\][ \t]*\[(.*?)\]/ );

      if ( m ) {
        // We can't check if the reference is known here as it likely wont be
        // found till after. Check it in md tree->hmtl tree conversion
        return [ m[0].length, [ "img_ref", { alt: m[1], ref: m[2], text: m[0] } ] ];
      }

      // Just consume the '!['
      return [ 2, "![" ];
    },

    "[": function link( text ) {
      // [link text](/path/to/img.jpg "Optional title")
      //      1          2            3       4         <--- captures
      var m = text.match( /^\[(.*?)\][ \t]*\([ \t]*(\S+)(?:[ \t]+(["'])(.*?)\3)?[ \t]*\)/ );

      if ( m ) {
        var attrs = { href: m[2] };
        if ( m[4] !== undefined)
          attrs.title = m[4];

        return [ m[0].length, [ "link", attrs, m[1] ] ];
      }

      // [Alt text][id]
      // [id]
      m = text.match( /^\[(.*?)\](?:\[(.*?)\])?/ );

      if ( m ) {
        // [id] case, text == id
        if ( m[2] === undefined ) m[2] = m[1];

        // We can't check if the reference is known here as it likely wont be
        // found till after. Check it in md tree->hmtl tree conversion
        return [ m[0].length, [ "link_ref", { ref: m[2] }, m[1] ] ];
      }

      // Just consume the '['
      return [ 1, "[" ];
    },


    "<": function autoLink( text ) {
      var m;

      if ( ( m = text.match( /^<(?:((https?|ftp|mailto):[^>]+)|(.*?@.*?\.[a-zA-Z]+))>/ ) ) != null ) {
        if ( m[3] ) {
          return [ m[0].length, [ "link", { href: "mailto:" + m[3] }, m[3] ] ];

        }
        else if ( m[2] == "mailto" ) {
          return [ m[0].length, [ "link", { href: m[1] }, m[1].substr("mailto:".length ) ] ];
        }
        else
          return [ m[0].length, [ "link", { href: m[1] }, m[1] ] ];
      }

      return [ 1, "<" ];
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
