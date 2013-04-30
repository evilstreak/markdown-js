// require modules under node.js; in a browser they'll already be present
if ( typeof chai === "undefined" ) { var chai = require( "chai" ); }
if ( typeof markdown === "undefined" ) { var markdown = require( "../lib/markdown" ); }

var assert = chai.assert;

// Utilities to load feature test-case input/output files
if ( typeof require === "undefined" ) {
  var feature_path = function( feature ) {
        return "features/" + feature;
      },
      list_tests = function( feature_path ) {
        console.log( feature_path );
      },
      test_path = function( feature_path, test ) {
        return feature_path + "/" + test;
      },
      slurp_test_files = function( test_path ) {
      };
}
else {
  var fs = require( "fs" ),
      path = require( "path" ),
      feature_path = function( feature ) {
        return path.join( __dirname, "features", feature );
      },
      list_tests = function( feature_path ) {
        return fs.readdirSync( feature_path )
                 .filter( function( f ) { return f.match( /\.text$/ ); } )
                 .map( function( f ) { return f.replace( /\.text$/, "" ); } );
      },
      test_path = function( feature_path, test ) {
        return path.join( feature_path, test );
      },
      slurp_test_files = function( test_path ) {
        return {
          text: fs.readFileSync( test_path + ".text", "utf8" ),
          json: JSON.parse( fs.readFileSync( test_path + ".json", "utf8" ) )
        };
      };
}

var dialects = {
  Gruber: [
    "blockquotes",
    "code",
    "emphasis",
    "headers",
    "horizontal_rules",
    "images",
    "linebreaks",
    "links",
    "lists"
  ]
};

dialects.Maruku = dialects.Gruber.slice( 0 );
dialects.Maruku.push( "meta", "definition_lists" );

for ( var d in dialects ) {
  suite( d, function() {
    for ( var feature in dialects[ d ] ) {
      suite( dialects[ d ][ feature ], function() {
        test_feature( d, dialects[ d ][ feature ] );
      } );
    }
  } );
}

function test_feature( dialect, feature ) {
  var path = feature_path( feature ),
      tests = list_tests( path );

  for ( var t in tests ) {
    var files = slurp_test_files( test_path( path, tests[ t ] ) );

    test( tests[ t ], function() {
      assert.deepEqual( files.json, markdown.toHTMLTree( files.text, dialect ) );
    } );
  }
}
