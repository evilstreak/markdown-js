/**
 *  render( jsonml ) -> String
 *  - jsonml (Array): JsonML array to render to XML
 */
exports.render = function( jsonml ) {
  // basic case
  if ( typeof jsonml === "string" ) {
    return jsonml;
  }

  var tag = jsonml.shift(),
      attributes = {},
      content = "";

  if ( jsonml.length && typeof jsonml[ 0 ] === "object" && !( jsonml[ 0 ] instanceof Array ) ) {
    attributes = jsonml.shift();
  }

  while ( jsonml.length ) {
    content += arguments.callee( jsonml.shift() );
  }

  var tag_attrs = "";
  for ( var a in attributes ) {
    tag_attrs += " " + a + '="' + attributes[ a ] + '"';
  }

  return "<"+ tag + tag_attrs + ">" + content + "</" + tag + ">";
}
