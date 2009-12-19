const peg = require( "PEG_generator" ),
      fs = require( "fs-base" ),
      system = require( "system" );

var grammar_file = system.args[ 1 ],
    parser_file = grammar_file + ".js",
    input = fs.rawOpen( system.args[ 2 ], "r" ).readWhole(),
    parser;

// check if the parser needs generating
if ( fs.isFile( parser_file ) && fs.lastModified( grammar_file ).getTime() === fs.lastModified( parser_file ).getTime() ) {
  parser = fs.rawOpen( parser_file, "r" ).readWhole();
}
else {
  print( "Generating parser..." );
  var grammar = fs.rawOpen( grammar_file, "r" ).readWhole();
  parser = peg.generateParser( grammar );

  // handle failed parsing
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

  parser = parser[ 1 ];
  fs.rawOpen( parser_file, "w" ).print( parser );
  fs.touch( parser_file, fs.lastModified( grammar_file ) );
}

var names = eval( parser ),
    root = names[ 0 ],
    tree = this[ root ]( input );

if ( !tree[ 0 ] ) {
  print( "names:", names.toSource() );
  print( "failed tree:", tree.toSource() );
  throw "Parsing failed";
}

// print( peg.showTree( tree[ 1 ], names ) );

var toHTML = function( tree, names ) {
  if ( typeof tree === "string" ) {
    // TODO turn raw content into a tree first
  }

  return peg.showTree( tree, names );
}

print( toHTML( tree[ 1 ], names ) );
