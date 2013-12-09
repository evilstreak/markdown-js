if (typeof define !== 'function') { var define = require('amdefine')(module) }
define([], function (w) {

  var DialectHelpers = {};
  DialectHelpers.inline_until_char = function( text, want ) {
    var consumed = 0,
        nodes = [];

    while ( true ) {
      if ( text.charAt( consumed ) === want ) {
        // Found the character we were looking for
        consumed++;
        return [ consumed, nodes ];
      }

      if ( consumed >= text.length ) {
        // No closing char found. Abort.
        return [consumed, null, nodes];
      }

      var res = this.dialect.inline.__oneElement__.call(this, text.substr( consumed ) );
      consumed += res[ 0 ];
      // Add any returned nodes.
      nodes.push.apply( nodes, res.slice( 1 ) );
    }
  };

  // Helper function to make sub-classing a dialect easier
  DialectHelpers.subclassDialect = function( d ) {
    function Block() {}
    Block.prototype = d.block;
    function Inline() {}
    Inline.prototype = d.inline;

    return { block: new Block(), inline: new Inline() };
  };

  return DialectHelpers;
});