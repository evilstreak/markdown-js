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
  var self = this;

  this.input = input;
  // To make walking the tree easier, switch numeric node 'names' to strings
  // And store start points too.
  this.fix_children_of = function(p) {
    var pos = p[4];
    p[2].forEach(function(n) {
      if (n[0] == -1) {
        // Anon nodes have no name, and are missing the children array
        n[0] = "P__anonymous__";
        n[2] = [];
      }
      else {
        // Name idx => string
        n[0] = names[n[0]];
      }

      // Start position
      n[4] = pos;
      pos += n[1];
    });
  }
  // Small helper method to get the text for a node
  this.get = function(n) {
    return this.input.substr(n[4],n[1]);
  }

  this.walk = this.__proto__.walk.bind(self);
  this.walkReduce = function(p,c) {
    //print("reducing on", uneval(c));
    return p + self.walk(c);
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
    return n[2].reduce(this.walkReduce, "");
  else
    return fn.call(this,n, n[2]);
};

Walker.prototype.walkers = {
  Document: "default",
  Block: "default",
  Heading: "default",
  BulletListTight: "default",
  ListBlock: "default",
  ListBlockLine: "default",

  AtxHeading: function (n, c) {
    var N = c[0][1];

    this.fix_children_of(c[2]);
    return c[2][2].reduce(this.walkReduce, "<h" + N + ">") +
           "</h" + N + ">\n\n";
  },

  Para: function (n, childen) {
    return childen.reduce(this.walkReduce, "<p>") +
           "</p>\n\n";
  },
  Plain: function (n, childen) {
    return "plains-parrot";
  },
  BulletList: function(n, c) {
    return c.reduce(this.walkReduce, "<ul>\n") +
           "</ul>\n\n";
  },

  ListItem: function(n, c) {
    return c.reduce(this.walkReduce, "  <li>") +
           "</li>\n";
  },

  P_line: function(n, c) {
    if (c[c.length-1][0] !== "P_eof") {
      return this.input.substr(n[4],n[1]-1);
    }
    return this.input.substr(n[4],n[1]);
  },

  Emph: function(n, c) {
    //return c[0].reduce(this.walkReduce, "<em>") + "</em>"
  },

  Inline: function(n,c) {
    var i = c[0];
    switch (i[0]) {
      case "Str":
      case "Space":
        return this.get(n);
      case "Endline":
        return "\n";
      case "Emph":
        /* There is an EmphStar or EmphUl node in the way:
         *
         * Inline:[ Emph: [ EmphStar:[ anon_star, Inline:X, Inline:X ] ] ]
         * Inline:[ Emph: [   EmphUl:[ anon_ul,   Inline:X, Inline:X ] ] ]
         *
         * We are intrested in the `X` inline nodes
         */
        this.fix_children_of(i);
        var emph_node = i[2][0];
        this.fix_children_of(emph_node);
        return emph_node[2].reduce(this.walkReduce, "<em>") + "</em>";
      case "Strong":
        // Same tree structure as Emph above
        this.fix_children_of(i);
        var emph_node = i[2][0];
        this.fix_children_of(emph_node);
        return emph_node[2].reduce(this.walkReduce, "<strong>") + "</strong>";
      default:
        throw Error("Missing Inline: " + c[0][0]);
    }
  }
};
