var Markdown = exports.Markdown = function Markdown(dialect) {
  this.references = { };
  this.dialect = dialect || Markdown.dialects.Default;
}

// Internal - split source into rough blocks
Markdown.prototype.split_blocks = function splitBlocks( input ) {
  // reverse the string so we can mimic a lookbehind
  var blocks = input.split( '' ).reverse().join( '' )
              .split( /(?=\n(?:\s*\n)+(?!\s*\n))/ ).reverse();

  // flip each string back around
  for ( var i in blocks )
    blocks[ i ] = blocks[ i ].split( '' ).reverse().join( '' );

  // collapse blanklines
  var j = 0;
  while ( j < blocks.length - 1 ) {
    if ( blocks[ j + 1 ].match( /^(?:\s*\n)+$/ ) ) {
      blocks[ j ] += blocks.splice( j + 1, 1 ).pop();
    }
    else {
      j++;
    }
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
    print( "Testing", ord[i] );
    var res = cbs[ ord[i] ].call( this, block, next );
    if ( res ) {
      print("  matched");
      if (res.length > 0 && res[0] instanceof Array )
        print(ord[i], "didn't return a proper array");
      return res;
    }
  }

  // Uhoh! no match! Should we throw an error?
  return [];
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
  this.tree = this.tree || [];

  blocks:
  while ( blocks.length ) {
    var b = this.processBlock( blocks.shift(), blocks );

    // Reference blocks and the like won't return any content
    if ( !b.length ) continue blocks;

    this.tree.push.apply( this.tree, b );
  }

  return this.tree;
}

Markdown.dialects = {};
Markdown.dialects.Default = {
  block: {
    atxHeader: function atxHeader( block, next ) {
      var m = block.match( /^(#{1,6})\s*(.*?)\s*#*$/ );

      if ( !m ) return undefined;

      var header = [ "header", { level: m[ 1 ].length }, m[ 2 ] ];

      return [ header ];
    },

    setextHeader: function setextHeader( block, next ) {
      var m = block.match( /^(.*)\n([-=])\2\2+$/ );

      if ( !m ) return undefined;

      var level = ( m[ 2 ] === "=" ) ? 1 : 2;
      var header = [ "header", { level : level }, m[ 1 ] ];

      return [ header ];
    },

    code: function code( block, next ) {
      // |    Foo
      // |bar
      // should be a code block followed by a paragraph. Fun
      //
      // There might also be adjacent code block to merge.

      var ret = undefined,
          regexp = /^(?:[ ]{4}|[ ]{1,3}[\t])(.*)\n?/;

      code_blocks:
      while (block) {
        // 4 spaces, or 1..3 spaces and a tab
        var m = block.match( regexp );

        if ( !m ) break;

        // Merging, add the 2 blank lines. TODO: It could have been more!
        if (ret) ret[1] += "\n\n" + m[1];
        else     ret = ["code_block", m[1]];

        // Now pull out the rest of the lines
        do  {
          block = block.substr( m[0].length );
          m = block.match( regexp );

          if ( !m ) break;
          ret[1] += "\n" +m[1];
        } while (block.length);

        if (block.length) {
          // Case alluded to in first comment. push it back on as a new block
          next.unshift(block);
          block = null;
        }
        else {
          // Check the next block - it might be code too
          block = next.shift();
        }
      }

      return ret ? [ret] : undefined;
    },

    bulletList: function bulletList( block, next ) {
      // copout
      return undefined;
    },

    para: function para( block, next ) {
      // everything's a para!
      return [ [ "para", block ] ];
    }
  },

  inline: []
};

// Build default order from insertion order.
(function(d) {

  var ord = [];
  for (i in d) ord.push( i );
  d.__order__ = ord;

})( Markdown.dialects.Default.block );

exports.toTree = function( source ) {
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
    var input = "# h1 #\n\npara1\n  \n\n\n\npara2\n",
        blocks = md.split_blocks(input);

    asserts.same(
        blocks,
        ["# h1 #\n\n",
         "para1\n  \n\n\n\n",
         "para2\n"
        ],
        "split_block should preserve trailing newlines");
  }),

  test_headers: tests.meta(function(md) {
    var h1 = md.dialect.block.atxHeader( "# h1 #", [] ),
        h2;

    asserts.same(
      h1,
      md.dialect.block.setextHeader( "h1\n===", [] ),
      "Atx and Setext style H1s should produce the same output" );

    asserts.same(
      md.dialect.block.atxHeader("# h1"),
      h1,
      "Closing # optional on atxHeader");

    asserts.same(
      h2 = md.dialect.block.atxHeader( "## h2", [] ),
      [["header", {level: 2}, "h2"]],
      "Atx h2 has right level");

    asserts.same(
      h2,
      md.dialect.block.setextHeader( "h2\n---", [] ),
      "Atx and Setext style H2s should produce the same output" );

  }),

  test_code: tests.meta(function(md) {
    asserts.same(
      md.dialect.block.code( "    foo\n    bar", [] ),
      [["code_block", "foo\nbar" ]],
      "Code block correct");

    var next = [];
    asserts.same(
      md.dialect.block.code( "    foo\n  bar", next ),
      [["code_block", "foo" ]],
      "Code block correct for abutting para");

    asserts.same(
      next, ["  bar"],
      "paragraph put back into next block");

    asserts.same(
      md.dialect.block.code( "    foo", ["    bar", ] ),
      [["code_block", "foo\n\nbar" ]],
      "adjacent code blocks ");

  })
}

if (require.main === module) {
  if ( require('system').args[1] === "--test") {
    var asserts = require('test').asserts;
    require('test').runner(tests);
  } else {
    try {
      print( uneval( exports.toTree("# h1 #\n\npara1\n\nsetext h2\n---------para2\n") ) );
    }
    catch (e) {
      print(e);
      print(e.stack);
      quit(1);
    }
  }
}













