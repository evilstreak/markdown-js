const peg = require( "PEG_generator" ),
      fs = require( "fs-base" ),
      system = require( "system" );

var grammar_file = fs.canonical(system.args[ 1 ]),
    parser_file = grammar_file + ".js",
    input = fs.rawOpen( system.args[ 2 ], "r" ).readWhole();

// check if the parser needs generating
if ( !fs.isFile( parser_file ) || fs.lastModified( grammar_file ).getTime() !== fs.lastModified( parser_file ).getTime() ) {
  print( "Generating parser..." );
  var grammar = fs.rawOpen( grammar_file, "r" ).readWhole(),
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
  var [, name] = /^function (.*)\(/.exec(parser),
      prelude = "// warnings: no\n",
      postlude = ";\nexports.parser = " + name + ";\n";
  fs.rawOpen( parser_file, "w" ).print( prelude + parser + postlude );
  fs.touch( parser_file, fs.lastModified( grammar_file ) );

}

var parser = require("file://" + parser_file).parser,
    names = parser.names,
    tree = parser( input );

if ( !tree[ 0 ] ) {
  print( "names:", names.toSource() );
  print( "failed tree:", tree.toSource() );
  throw "Parsing failed";
}

print( peg.showTree( tree[ 1 ], names ) );
