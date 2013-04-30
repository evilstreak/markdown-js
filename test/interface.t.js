// require modules under node.js; in a browser they'll already be present
if ( typeof chai === "undefined" ) { var chai = require( "chai" ); }
if ( typeof markdown === "undefined" ) { var markdown = require( "../lib/markdown" ); }

var assert = chai.assert;

suite( "arguments untouched", function() {
  var input = "A [link][id] by id.\n\n[id]: http://google.com",
      tree = markdown.parse( input ),
      // round trip through JSON to deep copy the tree
      clone = JSON.parse( JSON.stringify( tree ) ),
      output = markdown.toHTML( tree );

  test( "tree isn't modified", function() {
    assert.deepEqual( tree, clone );
  } );

  // We had a problem where we would accidentally remove the references
  // property from the root. We want to check the output is the same when
  // called twice.
  test( "output is consistent", function() {
    assert.deepEqual( markdown.toHTML( tree ), output );
  } );
} );
