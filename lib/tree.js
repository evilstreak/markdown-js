const peg = require( "PEG_generator" ),
      fs = require( "fs-base" ),
      system = require( "system" );

var grammar = fs.rawOpen( system.args[ 1 ], "r" ).readWhole(),
    input = fs.rawOpen( system.args[ 2 ], "r" ).readWhole(),
    parser = peg.generateParserThrowing( grammar ),
    names = eval( parser ),
    root = names[ 0 ],
    tree = this[ root ]( input );

if ( !tree[ 0 ] ) throw "Parsing failed";

// print( peg.showTree( tree[ 1 ], names ) );

var toHTML = function( tree, names ) {
  if ( typeof tree === "string" ) {
    // TODO turn raw content into a tree first
  }

  return peg.showTree( tree, names );
}

print( toHTML( tree[ 1 ], names ) );
