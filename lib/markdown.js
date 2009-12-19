const parser = require( "markdown.peg" ).parser;

exports.toTree = function( input ) {
  var tree = parser( input );

  if ( !tree[ 0 ] ) {
    throw "Could not parse the input";
  }

  return tree[ 1 ];
}

exports.toHTML = function( input ) {
  // automatically convert string input to a tree
  if ( typeof input === "string" ) {
    input = this.toTree( input );
  }

  return "LUL I AM SUM HMTL";
}
