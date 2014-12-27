# Changelog for markdown

## vNEXT - ???

- **Big change**: Drop official support for Node 0.8
- Use JSHint to validate code style and fix numerous warnings it flagged up
  ([#65]) Thanks [XhmikosR](https://github.com/XhmikosR)!
- Fix (yet more! gah) global variable leaks ([#99])
- Fix content tight between two `hr`'s disappearing ([#106])
- Use [Grunt](http://gruntjs.com/) to build tailored versions including allowing
  customizing of what dialects are included ([#113] - [Robin Ward](https://github.com/eviltrout))
- Add in a bower.json for easier use in non-node environments ([#184])
- Lots of small other fixes

## v0.5.0 - 2013-07-26

There might be other bug fixes then the ones listed - I've been a bit lax at
updating the changes file, sorry :(

- Fix "undefined" appearing in output for some cases with blockquotes
- Fix (multiple) global variable leaks. Ooops
- Allow spaces in img/link paths ([#48])
- Handle windows line endings ([#58])
- Fix IE8 issues ([#68], [#86], [#97])
- Fix images inside links mistakenly requiring a title attribute to parse
  correctly ([#71])
- Add explicit text of the license to the readme ([#74])
- Style tweaks by [XhmikosR](https://github.com/XhmikosR) ([#81], [#82], [#83])
- Build now tested by TravisCI thanks to [sebs](https://github.com/sebs) ([#85])
- Fix "cuddled" header parsing ([#94])
- Add support for tables to Maruku dialect ([#66]) Thanks [redsun82](https://github.com/redsun82)!


## v0.4.0 - 2012-06-09

- Improve link parsing when multiple on a line ([#5])
- `npm test` will now run the entire test suite cleanly
  (switch tests over to [node-tap](https://github.com/isaacs/node-tap)) ([#21])
- Fix blockquote merging/implicit conversion between string/String ([#24], [#44])
- Allow inline elements to appear inside link text ([#27])
- Fix to correctly render self-closing tags ([#28], [#35], [#40])
- Actually render image references ([#36])
- Make it work in IE7/8 ([#37])
- Improve link parsing when link is inside parenthesis ([#38])
- Fix JSLint warnings ([#42])
- `md2html` can now process stdin ([#43])
- Fix for anchors enclosed by parenthesis ([#46])



[#5]: https://github.com/evilstreak/markdown-js/issues/5
[#21]: https://github.com/evilstreak/markdown-js/issues/21
[#24]: https://github.com/evilstreak/markdown-js/issues/24
[#27]: https://github.com/evilstreak/markdown-js/issues/27
[#28]: https://github.com/evilstreak/markdown-js/issues/28
[#35]: https://github.com/evilstreak/markdown-js/issues/35
[#36]: https://github.com/evilstreak/markdown-js/issues/36
[#37]: https://github.com/evilstreak/markdown-js/issues/37
[#38]: https://github.com/evilstreak/markdown-js/issues/38
[#40]: https://github.com/evilstreak/markdown-js/issues/40
[#42]: https://github.com/evilstreak/markdown-js/issues/42
[#43]: https://github.com/evilstreak/markdown-js/issues/43
[#44]: https://github.com/evilstreak/markdown-js/issues/44
[#46]: https://github.com/evilstreak/markdown-js/issues/46
[#48]: https://github.com/evilstreak/markdown-js/issues/48
[#58]: https://github.com/evilstreak/markdown-js/issues/58
[#65]: https://github.com/evilstreak/markdown-js/issues/65
[#66]: https://github.com/evilstreak/markdown-js/issues/66
[#68]: https://github.com/evilstreak/markdown-js/issues/68
[#71]: https://github.com/evilstreak/markdown-js/issues/71
[#74]: https://github.com/evilstreak/markdown-js/issues/74
[#81]: https://github.com/evilstreak/markdown-js/issues/81
[#82]: https://github.com/evilstreak/markdown-js/issues/82
[#83]: https://github.com/evilstreak/markdown-js/issues/83
[#85]: https://github.com/evilstreak/markdown-js/issues/85
[#86]: https://github.com/evilstreak/markdown-js/issues/86
[#94]: https://github.com/evilstreak/markdown-js/issues/94
[#97]: https://github.com/evilstreak/markdown-js/issues/97
[#99]: https://github.com/evilstreak/markdown-js/issues/99
[#106]: https://github.com/evilstreak/markdown-js/issues/106
[#113]: https://github.com/evilstreak/markdown-js/issues/113
