const test = require('test'),
      asserts = test.asserts,
      fs = require( "fs-base" ),
      markdown = require( "markdown" );

// get the list of all test collections
var fixtures = fs.list( "fixtures" );

// get rid of the README
fixtures = fixtures.filter( function( x ) ! x.match( /\/README$/ ) );

for ( var f in fixtures ) {
  var name = fixtures[ f ].substring( fixtures[ f ].lastIndexOf( "/" ) + 1 );
  exports[ "test_" + name ] = function() {
    // grab all the test files in this fixture
    var tests = fs.list( fixtures[ f ] );

    // filter to only the raw files
    tests = tests.filter( function( x ) x.match( /\.text$/ ) );

    // remove the extensions
    tests = tests.map( function( x ) x.replace( /\.text$/, "" ) );

    for ( var t in tests ) {
      // load the raw text
      var text = fs.rawOpen( tests[ t ] + ".text", "r" ).readWhole();

      // load the target output
      var html = fs.isFile( tests[ t ] + ".html" )
        ? fs.rawOpen( tests[ t ] + ".html", "r" ).readWhole()
        : fs.rawOpen( tests[ t ] + ".xhtml", "r" ).readWhole();

      try {
        asserts.same( markdown.toHTML( text ),
                      html,
                      tests[ t ].substring( tests[ t ].lastIndexOf( "/" ) + 1 ) );
      }
      catch( e ) {
        asserts.ok( 0, "Couldn't parse " + tests[ t ].substring( tests[ t ].lastIndexOf( "/" ) + 1 ) + " -- " + e );
      }
    }
  }
}

if ( require.main === module ) {
  test.runner( exports );
}
