const peg = require( "PEG_generator" ),
      fs = require( "fs-base" ),
      system = require( "system" );

var grammar = fs.rawOpen( system.args[ 1 ], "r" ).readWhole(),
    input = fs.rawOpen( system.args[ 2 ], "r" ).readWhole(),
    parser = peg.generateParser( grammar );

if ( !parser[ 0 ] ) {
  var i = -1, line = 0;
  while ( i < parser[ 1 ].at ) {
    i = grammar.indexOf( "\n", i + 1 );
    if ( i !== -1 ) ++line;
  }
  print( "Generating failed on line " + line + ":" );
  print( grammar.substring( parser[ 1 ].at, parser[ 1 ].at + 80 ) );
  quit( 1 );
}
else {
  parser = parser[ 1 ];
}

var names = eval( parser ),
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
