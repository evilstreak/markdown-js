var Markdown = exports.Markdown = function Markdown(dialect) {
  this.references = { };
  this.dialect = dialect || Markdown.dialects.Default;
}

// Internal - split source into rough blocks
Markdown.prototype.split_blocks = function splitBlocks( input ) {
  var blocks = input.split( /\n(?:\s*\n)+|\n$/ );

  // cleanup the empty last child from `\n$` matching
  if ( blocks[ blocks.length - 1 ] === "" ) blocks.pop();

  return blocks;
}

/**
 *  Markdown#processBlock( block, next ) -> undefined | [ JsonML, ... ]
 *  - block (String): the block to process
 *  - next (Array): the following blocks
 *
 * Process `block` and return an array of JsonML nodes representing `block`.
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
        ["# h1 #",
         "para1",
         "para2"
        ], 
        "split_block stripped off final \\n");
  }),

  test_headers: tests.meta(function(md) {
    asserts.same(
      md.dialect.block.atxHeader( "# h1 #", [] ),
      md.dialect.block.setextHeader( "h1\n===", [] ),
      "Atx and Setext style H1s should produce the same output" );

    asserts.same(
      md.dialect.block.atxHeader( "## h2", [] ),
      md.dialect.block.setextHeader( "h2\n---", [] ),
      "Atx and Setext style H2s should produce the same output" );
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













