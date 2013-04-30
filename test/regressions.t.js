/*
 * This file contains tests that check various regressions on the individual
 * parsers, rather than the parser as a whole.
 */

// require modules under node.js; in a browser they'll already be present
if ( typeof chai === "undefined" ) { var chai = require( "chai" ); }
if ( typeof markdown === "undefined" ) { var markdown = require( "../lib/markdown" ); }

var assert = chai.assert,
    // test wrapper to pass each test a fresh markdown object
    t = function( fn ) { return function() { fn( new markdown.Markdown() ); }; },
    mk_block = markdown.Markdown.mk_block;

suite( "split_block", function() {
  test( "records trailing newlines", t( function( md ) {
    assert.deepEqual( md.split_blocks( "# h1 #\n\npara1\npara1L2\n  \n\n\n\npara2\n" ),
                      [ mk_block( "# h1 #", "\n\n", 1 ),
                        mk_block( "para1\npara1L2", "\n  \n\n\n\n", 3 ),
                        mk_block( "para2", "\n", 9 ) ] );
  } ) );

  test( "ignores leading newlines", t( function( md ) {
    assert.deepEqual( md.split_blocks( "\n\n# heading #\n\npara\n" ),
                      [ mk_block( "# heading #", "\n\n", 3 ),
                        mk_block( "para", "\n", 5 ) ] );
  } ) );
} );

suite( "headers", function() {
  test( "Atx and Setext style H1s should produce the same output", t( function( md ) {
    assert.deepEqual( md.dialect.block.setextHeader( "h1\n===\n\n", [] ),
                      [ [ "header", { level: 1 }, "h1" ] ] );
  } ) );

  test( "Closing # optional on atxHeader", t( function( md ) {
    assert.deepEqual( md.dialect.block.atxHeader.call( md, "# h1\n\n"),
                      [ [ "header", { level: 1 }, "h1" ] ] );
  } ) );

  test( "Atx h2 has right level", t( function( md ) {
    assert.deepEqual( md.dialect.block.atxHeader.call( md, "## h2\n\n", [] ),
                      [ [ "header", { level: 2 }, "h2" ] ] );
  } ) );

  test( "Atx and Setext style H2s should produce the same output", t( function( md ) {
    assert.deepEqual( md.dialect.block.setextHeader.call( md, "h2\n---\n\n", [] ),
                      [ [ "header", { level: 2 }, "h2" ] ] );
  } ) );
} );

suite( "code", function() {
  test( "next block untouched when its not code", t( function( md ) {
    var next = [ mk_block( "next" ) ];

    assert.deepEqual( md.dialect.block.code.call( md, mk_block( "    foo\n    bar" ), next ),
                      [ [ "code_block", "foo\nbar" ] ] );
    assert.deepEqual( next, [ mk_block( "next" ) ] );
  } ) );

  test( "Code block correct for abutting para", t( function( md ) {
    var next = [];

    assert.deepEqual( md.dialect.block.code.call( md, mk_block( "    foo\n  bar" ), next ),
                      [ [ "code_block", "foo" ] ] );
    assert.deepEqual( next, [ mk_block( "  bar" ) ] );
  } ) );

  test( "adjacent code blocks", t( function( md ) {
    assert.deepEqual( md.dialect.block.code.call( md, mk_block( "    foo" ), [ mk_block( "    bar" ) ] ),
                      [ [ "code_block", "foo\n\nbar" ] ] );
  } ) );

  test( "adjacent code blocks preserve correct number of empty lines", t( function( md ) {
    assert.deepEqual( md.dialect.block.code.call( md,
                                                  mk_block( "    foo", "\n  \n      \n" ),
                                                  [ mk_block( "    bar" ) ] ),
                      [ [ "code_block", "foo\n\n\nbar" ] ] );
  } ) );
} );

suite( "bulletlist", function() {
  var bl = function() { return this.dialect.block.lists.apply( this, arguments ); };

  test( "single line bullets", t( function( md ) {
    assert.deepEqual( bl.call( md, mk_block( "* foo\n* bar" ), [] ),
                      [ [ "bulletlist", [ "listitem", "foo" ], [ "listitem", "bar" ] ] ] );
  } ) );

  test( "link in bullet", t( function( md ) {
    assert.deepEqual( bl.call( md, mk_block( "* [text](url)" ), [] ),
                      [ [ "bulletlist", [ "listitem", [ "link", { href: "url" }, "text" ] ] ] ] );
  } ) );

  test( "multiline lazy bullets", t( function( md ) {
    assert.deepEqual( bl.call( md, mk_block( "* foo\nbaz\n* bar\nbaz" ), [] ),
                      [ [ "bulletlist", [ "listitem", "foo\nbaz" ], [ "listitem", "bar\nbaz" ] ] ] );
  } ) );

  test( "multiline tidy bullets", t( function( md ) {
    assert.deepEqual( bl.call( md, mk_block( "* foo\n  baz\n* bar\n  baz" ), [] ),
                      [ [ "bulletlist", [ "listitem", "foo\nbaz" ], [ "listitem", "bar\nbaz" ] ] ] );
  } ) );

  test( "only trim 4 spaces from the start of the line", t( function( md ) {
    assert.deepEqual( bl.call( md, mk_block( "* foo\n     baz" ), [] ),
                      [ [ "bulletlist", [ "listitem", "foo\n baz" ] ] ] );
  } ) );

  test( "loose bullet lists can have multiple paragraphs", t( function( md ) {
    assert.deepEqual( bl.call( md, mk_block( "  * one" ), [ mk_block( "    two" ) ] ),
                      [ [ "bulletlist", [ "listitem", [ "para", "one" ], [ "para", "two" ] ] ] ] );
  } ) );

  // Case: no space after bullet - not a list
  // *↵
  //foo
  test( "Space required after bullet to trigger list", t( function( md ) {
    assert.deepEqual( bl.call( md, mk_block(" *\nfoo") ), undefined );
  } ) );

  // Case: note the space after the bullet
  // *␣
  //foo
  //bar
  test( "space+continuation lines" ); //, t( function( md ) {
  //  assert.deepEqual( bl.call( md, mk_block(" * \nfoo\nbar"), [ ] ),
  //                    [ [ "bulletlist", [ "listitem", "foo\nbar" ] ] ],
  //} ) );

  // Case I:
  // * foo
  //     * bar
  //   * baz
  test( "Interesting indented lists I", t( function( md ) {
    assert.deepEqual( bl.call( md, mk_block( " * foo\n      * bar\n    * baz" ), [] ),
                      [ [ "bulletlist",
                          [ "listitem",
                            "foo",
                            [ "bulletlist",
                              [ "listitem",
                                "bar",
                                [ "bulletlist",
                                  [ "listitem", "baz" ]
                                ]
                              ]
                            ]
                          ]
                      ] ] );
  } ) );

  // Case II:
  // * foo
  //      * bar
  // * baz
  test( "Interesting indented lists II", t( function( md ) {
    assert.deepEqual( bl.call( md, mk_block( " * foo\n      * bar\n * baz" ), [] ),
                      [ [ "bulletlist",
                          [ "listitem",
                            "foo",
                            [ "bulletlist",
                              [ "listitem", "bar" ]
                            ]
                          ],
                          [ "listitem", "baz" ]
                      ] ] );
  } ) );

  // Case III:
  //  * foo
  //   * bar
  //* baz
  // * fnord
  test( "Interesting indented lists III", t( function( md ) {
    assert.deepEqual( bl.call( md, mk_block( "  * foo\n   * bar\n* baz\n * fnord" ), [] ),
                      [ [ "bulletlist",
                          [ "listitem",
                            "foo",
                            [ "bulletlist",
                              [ "listitem", "bar" ],
                              [ "listitem", "baz" ],
                              [ "listitem", "fnord" ]
                            ]
                          ]
                      ] ] );
  } ) );

  // Case IV:
  // * foo
  //
  // 1. bar
  test( "Different lists at same indent IV", t( function( md ) {
    assert.deepEqual( bl.call( md, mk_block( " * foo" ), [ mk_block( " 1. bar\n" ) ] ),
                      [ [ "bulletlist",
                          ["listitem", ["para", "foo"] ],
                          ["listitem", ["para", "bar"] ]
                      ] ] );
  } ) );

  // Case V:
  //   * foo
  //  * bar
  // * baz
  test( "Indenting Case V", t( function( md ) {
    assert.deepEqual( bl.call( md, mk_block( "   * foo\n  * bar\n * baz" ), [] ),
                      [ [ "bulletlist",
                          [ "listitem",
                            "foo",
                            [ "bulletlist",
                              ["listitem", "bar"],
                              ["listitem", "baz"],
                            ]
                          ]
                      ] ] );
  } ) );

  // Case VI: deep nesting
  //* one
  //    * two
  //        * three
  //            * four
  test( "deep nested lists VI", t( function( md ) {
    assert.deepEqual( bl.call( md, mk_block( "* one\n    * two\n        * three\n            * four" ), [] ),
                      [ [ "bulletlist",
                          [ "listitem",
                            "one",
                            [ "bulletlist",
                              [ "listitem",
                                "two",
                                [ "bulletlist",
                                  [ "listitem",
                                    "three",
                                    [ "bulletlist",
                                      [ "listitem", "four" ]
                                    ]
                                  ]
                                ]
                              ]
                            ]
                          ]
                      ] ] );
  } ) );

  // Case VII: This one is just fruity!
  //   * foo
  //  * bar
  // * baz
  //* HATE
  //  * flibble
  //   * quxx
  //    * nest?
  //        * where
  //      * am
  //     * i?
  test( "Indenting Case VII", t( function( md ) {
    assert.deepEqual( bl.call( md, mk_block( "   * foo\n" +
                                             "  * bar\n" +
                                             " * baz\n" +
                                             "* HATE\n" +
                                             "  * flibble\n" +
                                             "   * quxx\n" +
                                             "    * nest?\n" +
                                             "        * where\n" +
                                             "      * am\n" +
                                             "     * i?"), [] ),
                      [ [ "bulletlist",
                          [ "listitem",
                            "foo",
                            [ "bulletlist",
                              ["listitem", "bar"],
                              ["listitem", "baz"],
                              ["listitem", "HATE"],
                              ["listitem", "flibble"]
                            ]
                          ],
                          [ "listitem",
                            "quxx",
                            [ "bulletlist",
                              [ "listitem",
                                "nest?",
                                [ "bulletlist",
                                  ["listitem", "where"],
                                  ["listitem", "am"],
                                  ["listitem", "i?"]
                                ]
                              ]
                            ]
                          ]
                      ] ] );
  } ) );

  // Case VIII: Deep nesting + code block
  //   * one
  //    * two
  //        * three
  //                * four
  //
  //                foo
  test( "Case VIII: Deep nesting and code block", t( function( md ) {
    assert.deepEqual( bl.call( md, mk_block( "   * one\n" +
                                             "    1. two\n" +
                                             "        * three\n" +
                                             "                * four", "\n\n" ),
                                   [ mk_block( "                foo" ) ] ),
                      [ [ "bulletlist",
                          [ "listitem",
                            ["para", "one"],
                            [ "numberlist",
                              [ "listitem",
                                ["para", "two"],
                                [ "bulletlist",
                                  [ "listitem",
                                    [ "para", "three\n    * four"],
                                    ["code_block", "foo"]
                                  ]
                                ]
                              ]
                            ]
                          ]
                      ] ] );
  } ) );
} );

suite( "horizRule", function() {
  [ "---", "_ __", "** ** **", "--- " ].forEach( function(s) {
    test( '"' + s + '"', t( function( md ) {
      assert.deepEqual( md.dialect.block.horizRule.call( md, mk_block( s ), [] ),
                        [ [ "hr" ] ] );
    } ) );
  } );
} );

suite( "blockquote", function() {
  test( "simple blockquote", t( function( md ) {
    assert.deepEqual( md.dialect.block.blockquote.call( md, mk_block( "> foo\n> bar" ), [] ),
                      [ [ "blockquote", [ "para", "foo\nbar" ] ] ] );
  } ) );

  // Note: this tests horizRule as well through block processing.
  test( "blockquote with interesting content", t( function( md ) {
    assert.deepEqual( md.dialect.block.blockquote.call( md, mk_block( "> foo\n> bar\n>\n>- - - " ), [] ),
                      [ [ "blockquote", [ "para", "foo\nbar" ], [ "hr" ] ] ] );
  } ) );
} );

suite( "referenceDefn", function() {
  test( "double quoted title", t( function( md ) {
    md.tree = [ "markdown" ];
    md.dialect.block.referenceDefn.call( md, mk_block( '[id]: http://example.com/  "Optional Title Here"' ) );

    assert.deepEqual( md.tree[ 1 ].references,
                      { "id": { href: "http://example.com/", title: "Optional Title Here" } } )
  } ) );

  test( "single quoted title", t( function( md ) {
    md.tree = [ "markdown" ];
    md.dialect.block.referenceDefn.call( md, mk_block( "[id]: http://example.com/  'Optional Title Here'" ) );

    assert.deepEqual( md.tree[ 1 ].references,
                      { "id": { href: "http://example.com/", title: "Optional Title Here" } } )
  } ) );

  test( "bracketed title", t( function( md ) {
    md.tree = [ "markdown" ];
    md.dialect.block.referenceDefn.call( md, mk_block( '[id]: http://example.com/  (Optional Title Here)' ) );

    assert.deepEqual( md.tree[ 1 ].references,
                      { "id": { href: "http://example.com/", title: "Optional Title Here" } } )
  } ) );

  // Check a para abbuting a ref works right
  var md = new markdown.Markdown(),
      next = [];
  md.tree = [ "markdown" ];

  test( "ref processed", function() {
    assert.deepEqual( md.dialect.block.referenceDefn.call( md, mk_block( "[id]: example.com\npara" ), next ), [] );
  } );

  test( "reference extracted", function() {
    assert.deepEqual( md.tree[ 1 ].references, { "id": { href: "example.com" } } );
  } );

  test( "paragraph put back into blocks", function() {
    assert.deepEqual( next, [ mk_block( "para" ) ] );
  } );
} );

suite( "inline_br", function() {
  test( "linebreak+escape", t( function( md ) {
    assert.deepEqual( md.processInline( "foo  \n\\[bar" ),
                      [ "foo", [ "linebreak" ], "[bar" ] );
  } ) );
} );

suite( "inline_escape", function() {
  test( "invalid escape", t( function( md ) {
    assert.deepEqual( md.processInline( "\\bar" ), [ "\\bar" ] );
  } ) );

  test( "escaped em", t( function( md ) {
    assert.deepEqual( md.processInline( "\\*foo*" ), [ "*foo*" ] );
  } ) );
} );

suite( "inline_code", function() {
  test( "`bar`", t( function( md ) {
    assert.deepEqual( md.processInline( "`bar`" ), [ [ "inlinecode", "bar" ] ] );
  } ) );

  test( "``b`ar``", t( function( md ) {
    assert.deepEqual( md.processInline( "``b`ar``" ), [ [ "inlinecode", "b`ar" ] ] );
  } ) );

  test( "```bar``` baz", t( function( md ) {
    assert.deepEqual( md.processInline( "```bar``` baz" ), [ [ "inlinecode", "bar" ], " baz" ] );
  } ) );
} );

suite( "inline_strong_em", function() {
  // Yay for horrible edge cases >_<
  test( "foo *abc* bar", t( function( md ) {
    assert.deepEqual( md.processInline( "foo *abc* bar" ), [ "foo ", [ "em", "abc" ], " bar" ] );
  } ) );

  test( "*abc `code`", t( function( md ) {
    assert.deepEqual( md.processInline( "*abc `code`" ), [ "*abc ", [ "inlinecode", "code" ] ] );
  } ) );

  test( "*abc**def* after", t( function( md ) {
    assert.deepEqual( md.processInline( "*abc**def* after" ), [ [ "em", "abc**def" ], " after" ] );
  } ) );

  test( "*em **strong * wtf**", t( function( md ) {
    assert.deepEqual( md.processInline( "*em **strong * wtf**" ), [ [ "em", "em **strong " ], " wtf**" ] );
  } ) );

  test( "*foo _b*a*r baz", t( function( md ) {
    assert.deepEqual( md.processInline( "*foo _b*a*r baz" ), [ [ "em", "foo _b" ], "a*r baz" ] );
  } ) );

  // <strong><em>foo</em></strong>
  test( "***foo***" );
} );

suite( "inline_img", function() {
  test( "url", t( function( md ) {
    assert.deepEqual( md.processInline( "![alt] (url)" ),
                      [ [ "img", { href: "url", alt: "alt" } ] ] );
  } ) );

  test( "single quoted title", t( function( md ) {
    assert.deepEqual( md.processInline( "![alt](url 'title')" ),
                      [ [ "img", { href: "url", alt: "alt", title: "title" } ] ] );
  } ) );

  test( "messy title", t( function( md ) {
    assert.deepEqual( md.processInline( "![alt] (url 'tit'le') after')" ),
                      [ [ "img", { href: "url", alt: "alt", title: "tit'le" } ], " after')" ] );
  } ) );

  test( "double quoted title", t( function( md ) {
    assert.deepEqual( md.processInline( '![alt] (url "title")' ),
                      [ [ "img", { href: "url", alt: "alt", title: "title" } ] ] );
  } ) );

  test( "escaped url", t( function( md ) {
    assert.deepEqual( md.processInline( '![Alt text](/path/to/img\\\\.jpg "Optional title")' ),
                      [ [ "img", { href: "/path/to/img\\.jpg", alt: "Alt text", title: "Optional title" } ] ] );
  } ) );

  test( "reference", t( function( md ) {
    assert.deepEqual( md.processInline( "![alt][id]" ),
                      [ [ "img_ref", { ref: "id", alt: "alt", original: "![alt][id]" } ] ] );
  } ) );

  test( "reference after space", t( function( md ) {
    assert.deepEqual( md.processInline( "![alt] [id]" ),
                      [ [ "img_ref", { ref: "id", alt: "alt", original: "![alt] [id]" } ] ] );
  } ) );
} );

suite( "inline_link", function() {
  test( "url", t( function( md ) {
    assert.deepEqual( md.processInline( "[text] (url)" ),
                      [ [ "link", { href: "url" }, "text" ] ] );
  } ) );

  test( "single quoted title", t( function( md ) {
    assert.deepEqual( md.processInline( "[text](url 'title')" ),
                      [ [ "link", { href: "url", title: "title" }, "text" ] ] );
  } ) );

  test( "messy title", t( function( md ) {
    assert.deepEqual( md.processInline( "[text](url 'tit'le') after')" ),
                      [ [ "link", { href: "url", title: "tit'le" }, "text" ], " after')" ] );
  } ) );

  test( "double quoted title", t( function( md ) {
    assert.deepEqual( md.processInline( '[text](url "title")' ),
                      [ [ "link", { href: "url", title: "title" }, "text" ] ] );
  } ) );

  test( "reference", t( function( md ) {
    assert.deepEqual( md.processInline( "[text][id]" ),
                      [ [ "link_ref", { ref: "id", original: "[text][id]" }, "text" ] ] );
  } ) );

  test( "reference after space", t( function( md ) {
    assert.deepEqual( md.processInline( "[text] [id]" ),
                      [ [ "link_ref", { ref: "id", original: "[text] [id]" }, "text" ] ] );
  } ) );

  test( "ref and page anchor", t( function( md ) {
    assert.deepEqual( md.processInline( "[to put it another way][SECTION 1] or even [link this](#SECTION-1)" ),
                      [ [ "link_ref",
                          { ref: "section 1", original: "[to put it another way][SECTION 1]" },
                          "to put it another way"
                        ],
                        " or even ",
                        [ "link",
                          { href: "#SECTION-1" },
                          "link this" ], ] );
  } ) );
} );

suite( "inline_autolink", function() {
  test( "url", t( function( md ) {
    assert.deepEqual( md.processInline( "<http://foo.com>" ),
                      [ [ "link", { href: "http://foo.com" }, "http://foo.com" ] ] );
  } ) );

  test( "mailto", t( function( md ) {
    assert.deepEqual( md.processInline( "<mailto:foo@bar.com>" ),
                      [ [ "link", { href: "mailto:foo@bar.com" }, "foo@bar.com" ] ] );
  } ) );

  test( "email", t( function( md ) {
    assert.deepEqual( md.processInline( "<foo@bar.com>" ),
                      [ [ "link", { href: "mailto:foo@bar.com" }, "foo@bar.com" ] ] );
  } ) );
} );

suite( "line_endings", function() {
  // try to generate this tree with all types of line ending
  var tree = [ "markdown", [ "para", "Foo" ], [ "para", "Bar" ] ];

  test( "Unix", t( function( md ) {
    assert.deepEqual( md.toTree( "Foo\n\nBar", [ "markdown" ] ), tree );
  } ) );

  test( "Windows", t( function( md ) {
    assert.deepEqual( md.toTree( "Foo\r\n\r\nBar", [ "markdown" ] ), tree );
  } ) );

  test( "Mac", t( function( md ) {
    assert.deepEqual( md.toTree( "Foo\r\rBar", [ "markdown" ] ), tree );
  } ) );

  test( "Mixed", t( function( md ) {
    assert.deepEqual( md.toTree( "Foo\r\n\nBar", [ "markdown" ] ), tree );
  } ) );
} );
