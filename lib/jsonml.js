/**
 *  render( jsonml ) -> String
 *  - jsonml (Array): JsonML array to render to XML
 */
exports.render = function( jsonml, options ) {
  options = options || {};
  // include the root element in the rendered output?
  options.root = options.root || false;

  var content = [];

  if ( options.root ) {
    content.push( this.render_tree( jsonml ) );
  }
  else {
    jsonml.shift(); // get rid of the tag
    if ( jsonml.length && typeof jsonml[ 0 ] === "object" && !( jsonml[ 0 ] instanceof Array ) ) {
      jsonml.shift(); // get rid of the attributes
    }

    while ( jsonml.length ) {
      content.push( this.render_tree( jsonml.shift() ) );
    }
  }

  return content.join( "\n" );
}

exports.render_tree = function( jsonml ) {
  // basic case
  if ( typeof jsonml === "string" ) {
    return jsonml;
  }

  var tag = jsonml.shift(),
      attributes = {},
      content = [];

  if ( jsonml.length && typeof jsonml[ 0 ] === "object" && !( jsonml[ 0 ] instanceof Array ) ) {
    attributes = jsonml.shift();
  }

  while ( jsonml.length ) {
    content.push( arguments.callee( jsonml.shift() ) );
  }

  var tag_attrs = "";
  for ( var a in attributes ) {
    tag_attrs += " " + a + '="' + attributes[ a ] + '"';
  }

  return "<"+ tag + tag_attrs + ">" + content.join( "\n" ) + "</" + tag + ">\n";
}

/**
 *  toHtml( jsonml ) -> Array
 *  - jsonml (Array): a Markdown tree
 *
 *  Converts a Markdown JsonML tree into an HTML JsonML tree.
 */
exports.toHtml = function( jsonml ) {
  var md = jsonml.slice( 0 );

  return this.convert_tree_to_html( md );
}

exports.convert_tree_to_html = function( jsonml ) {
  // basic case
  if ( typeof jsonml === "string" ) {
    return jsonml;
  }

  // convert this node
  switch ( jsonml[ 0 ] ) {
    case "header":
      jsonml[ 0 ] = "h" + jsonml[ 1 ].level;
      delete jsonml[ 1 ].level;
      break;
    case "bulletlist":
      jsonml[ 0 ] = "ul";
      break;
    case "numberlist":
      jsonml[ 0 ] = "ol";
      break;
    case "listitem":
      jsonml[ 0 ] = "li";
      break;
    case "para":
      jsonml[ 0 ] = "p";
      break;
    case "markdown":
      jsonml[ 0 ] = "html";
      break;
    case "code_block":
      jsonml[ 0 ] = "pre";
      var i = ( jsonml.length && typeof jsonml[ 0 ] === "object" && !( jsonml[ 0 ] instanceof Array ) )
            ? 2
            : 1;
      var code = [ "code" ];
      code.push.apply( code, jsonml.splice( i ) );
      jsonml[ i ] = code;
      break;
  }

  // convert all the children
  var i = 1;

  // skip the attribute node, if it exists
  if ( jsonml.length && typeof jsonml[ 0 ] === "object" && !( jsonml[ 0 ] instanceof Array ) ) {
    ++i;
  }

  for ( ; i < jsonml.length; ++i ) {
    arguments.callee( jsonml[ i ] );
  }

  return jsonml;
}
