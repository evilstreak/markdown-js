var markdown = require('markdown')

function test_dialect( dialect, features ) {
  var dialect_test = exports[ "test_" + dialect ] = {};

  for ( var f in features ) {
    ( function( feature ) {
      dialect_test[ "test_" + feature ] = function() {
        var test_path = path + feature + "/";

        // grab all the test files in this feature
        var tests = fs.list( test_path );

        // filter to only the raw files
        tests = tests.filter( function( x ) {return x.match( /\.text$/ ) } );

        // remove the extensions
        tests = tests.map( function( x ) {return x.replace( /\.text$/, "" ) } );

        for ( var t in tests ) {
          // load the raw text
          var test_name = tests[ t ].substring( tests[ t ].lastIndexOf( "/" ) + 1 ),
              text = slurpFile( test_path + tests[ t ] + ".text" );

          // load the target output
          if ( fs.isFile( test_path + tests[ t ] + ".json" ) ) {
            try {
              var json_text = slurpFile( test_path + tests[ t ] + ".json" );
              var json = JSON.parse( json_text );

              var output = markdown.toHTMLTree( text, dialect );
              asserts.same( output, json, test_name );
            }
            catch( e ) {
              asserts.ok( 0, "Failed with error on " + test_name + ": " + e );
              if ( e.stack )
                asserts.diag( e.stack );
            }
          }
          else {
            asserts.ok( 0, "No target output for " + test_name );
          }
        }
      }
    } )( features[ f ] );
  }
}


// Bootstrap code
if ( typeof process != "undefined" && process.title == "node" ) {
  // Setup for node
  var test = require( 'patr/runner' ),
      asserts = require( 'assert' ),
      n_fs = require( 'fs' ),
      args = process.argv.splice( 1 ),
      path = __dirname + "/features/";

  test.runner = test.run;

  var slurpFile = function( f ) {
    return n_fs.readFileSync( f, 'utf8' );
  }

  var fs = {
    list: n_fs.readdirSync,
    rawOpen: n_fs.openSync,
    isFile: function( f ) {
      return n_fs.statSync( f ).isFile()
    },
  };

  asserts.same = asserts.deepEqual;
}
else {
  // Setup for flusspferd
  var test = require('test');
      asserts = test.asserts,
      fs = require( "fs-base" ),
      args = require( "system" ).args.splice( 1 ),
      path = module.resource.resolve( "features" );

  var slurpFile = function ( f ) {
    var s = fs.rawOpen( f, "r" );
    var t = s.readWhole();
    s.close();
    return t;
  }
}




if ( require.main === module ) {
  var dialects = {};
  dialects.Gruber = [
    "blockquotes",
    "code",
    "emphasis",
    "headers",
    "horizontal_rules",
    "images",
    "linebreaks",
    "links",
    "lists"
  ];

  dialects.Maruku = dialects.Gruber.slice( 0 );
  dialects.Maruku.push( "meta", "definition_lists" );

  // TODO if dialects/features were passed on the command line, filter to them
  // if ( args.length ) {
  //   features = features.filter( function( x ) args.indexOf( x ) !== -1 );
  // }

  for ( d in dialects ) {
    test_dialect( d, dialects[ d ] );
  }

  test.runner( exports );
}
