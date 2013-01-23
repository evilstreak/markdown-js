(function(){
var markdown = require('markdown').markdown;

// File content was a README.md
// Line of interest:
// [![Build Status](https://travis-ci.org/hamsterwheeldesigns/underware.png?branch=master)](https://travis-ci.org/hamsterwheeldesigns/underware)

/*require('fs').readFile(path,'ascii',function(err,data){
  var out = markdown.toHTML(data);
  self.end(out);
});*/

var out = markdown.toHTML('[![Build Status](https://travis-ci.org/hamsterwheeldesigns/underware.png?branch=master)](https://travis-ci.org/hamsterwheeldesigns/underware)');
console.log(out);
})();
