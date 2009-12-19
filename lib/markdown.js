const parser = require( "markdown.peg" ).parser;

exports.toTree = function( input ) {
  var tree = parser( input );

  if ( !tree[ 0 ] ) {
    throw "Could not parse the input";
  }

  return tree[ 1 ];
}

exports.toHTML = function( input, tree ) {
  if ( !tree )
    tree = this.toTree( input );

  var walker = new Walker(input, parser.names);
  tree[0] = parser.names[tree[0]]; // Fix up root name
  tree[4] = 0; // Set start position of root node
  return walker.walk(tree);
}


function Walker(input, names) {
  this.input = input;
  // To make walking the tree easier, switch numeric node 'names' to strings
  // And store start points too.
  this.fix_children_of = function(p) {
    var pos = p[4];
    p[2].forEach(function(n) {
      // Name idx => string
      n[0] = names[n[0]];
      // Start position
      n[4] = pos;
      pos += n[1];
    });
  }
  // Small helper method
  this.get = function(start, end) {
    return this.input.substring(start,end);
  }
}

Walker.prototype.walk = function(n) {
  // Fixup the names for our immediate children
  this.fix_children_of(n);

  var fn = this.walkers[n[0]];
  if (fn === undefined) {
    if (n[0].substr(0,2) == "P_")
      return "";
    else
      throw new Error("Missing walker for " + n[0]);
  }
  else if (fn === "default")
    return n[2].map(this.walk, this).join("");
  else
    return fn.call(this,n, n[2]);
};

Walker.prototype.walkers = {
  Document: "default",
  Block: "default",
  Heading: "default",

  AtxHeading: function (n, children) {
    var N = children.shift()[1];

    var ret = "<h" + N + ">";
    ret += "</h" + N + ">\n\n";
    return ret;
  },

  Para: function (n, childen) {
    return "<p>I AM A PARADOG</p>\n";
  },
  Plain: function (n, childen) {
    return "plains-parrot";
  },
};
