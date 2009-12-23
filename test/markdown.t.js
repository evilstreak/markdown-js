const test = require('test'),
      asserts = test.asserts,
      fs = require( "fs-base" ),
      markdown = require( "md" );

// get the list of all test collections
var fixtures = fs.list( module.resource.resolve("fixtures") );

// get rid of the README
fixtures = fixtures.filter( function( x ) ! x.match( /\/README$/ ) );

for ( var f in fixtures ) {
  ( function( fixture ) {
    var name = fixture.substring( fixture.lastIndexOf( "/" ) + 1 );
    exports[ "test_" + name ] = function() {
      // grab all the test files in this fixture
      var tests = fs.list( fixture );

      // filter to only the raw files
      tests = tests.filter( function( x ) x.match( /\.text$/ ) );

      // remove the extensions
      tests = tests.map( function( x ) x.replace( /\.text$/, "" ) );

      for ( var t in tests ) {
        // load the raw text
        var text_file = fs.rawOpen( tests[ t ] + ".text", "r" ),
            text = text_file.readWhole();
        text_file.close();

        // load the target output
        var html_file = fs.isFile( tests[ t ] + ".html" )
          ? fs.rawOpen( tests[ t ] + ".html", "r" )
          : fs.rawOpen( tests[ t ] + ".xhtml", "r" );

        var html = html_file.readWhole();
        html_file.close();

        try {
          asserts.same( markdown.toHtml( text ),
                        html,
                        tests[ t ].substring( tests[ t ].lastIndexOf( "/" ) + 1 ) );
        }
        catch( e ) {
          asserts.ok( 0, "Couldn't parse " + tests[ t ].substring( tests[ t ].lastIndexOf( "/" ) + 1 ) + " -- " + e );
        }
      }
    }
  } )( fixtures[ f ] );
}

if ( require.main === module ) {
  test.runner( exports );
}
