if (typeof define !== 'function') { var define = require('amdefine')(module); }

// Include all our dependencies and return the resulting library.

define(['./dialects/landmark/index'], function(Landmark) {
  return Landmark;
});
