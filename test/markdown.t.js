const test = require('test'),
      asserts = test.asserts,
      fs = require( "fs-base" ),
      markdown = require( "markdown" ),
      args = require( "system" ).args.splice( 1 );

// get the list of all test collections
var path = module.resource.resolve( "features" ),
    features = fs.list( path );

// if features were passed on the command line, filter to them
if ( require.main === module && args.length ) {
  features = features.filter( function( x ) args.indexOf( x ) !== -1 );
}

for ( var f in features ) {
  ( function( feature ) {
    exports[ "test_" + feature ] = function() {
      var test_path = path + feature + "/";

      // grab all the test files in this feature
      var tests = fs.list( test_path );

      // filter to only the raw files
      tests = tests.filter( function( x ) x.match( /\.text$/ ) );

      // remove the extensions
      tests = tests.map( function( x ) x.replace( /\.text$/, "" ) );

      for ( var t in tests ) {
        // load the raw text
        var test_name = tests[ t ].substring( tests[ t ].lastIndexOf( "/" ) + 1 ),
            text_file = fs.rawOpen( test_path + tests[ t ] + ".text", "r" ),
            text = text_file.readWhole();
        text_file.close();

        // load the target output
        if ( fs.isFile( test_path + tests[ t ] + ".json" ) ) {
          try {
            var json_file = fs.rawOpen( test_path + tests[ t ] + ".json", "r" ),
                json = JSON.parse( json_file.readWhole() );
            json_file.close();

            var output = markdown.toHTMLTree( markdown.parse( text ) );
            asserts.same( output, json, test_name );
          }
          catch( e ) {
            asserts.ok( 0, "Failed with error on " + test_name + ": " + e );
          }
        }
        else {
          asserts.ok( 0, "No target output for " + test_name );
        }
      }
    }
  } )( features[ f ] );
}

if ( require.main === module ) {
  test.runner( exports );
}
