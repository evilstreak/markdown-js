module.exports = function(grunt) {

  var pkg = grunt.file.readJSON('package.json');

  grunt.initConfig({
    pkg: pkg,
    env: process.env,

    node_tap: {
      default_options: {
        options: {
          outputType: 'failures',
          outputTo: 'console'
        },
        files: {
          'tests': ['./test/*.t.js']
        }
      }
    },

    jshint: {
      files: ['Gruntfile.js', 'lib/**/*.js', 'test/**/*.js'],
      options: {
        "browser": false,
        "maxerr": 100,
        "node": true,
        "camelcase": false,
        "curly": false,
        "eqeqeq": true,
        "eqnull": true,
        "forin": false,
        "globals": {
          "print": true,
          "uneval": true,
          "window": true
        },
        "immed": true,
        "latedef": true,
        "laxbreak": true,
        "laxcomma": true,
        "lastsemic": true,
        "loopfunc": true,
        "noarg": true,
        "newcap": true,
        "plusplus": false,
        "quotmark": "true",
        "regexp": true,
        "shadow": true,
        "strict": false,
        "sub": true,
        "trailing": true,
        "undef": true,
        "unused": false,
        ignores: ['.git', 'node_modules']
      }
    }
  });

  grunt.registerTask('default', ['test']);
  grunt.registerTask('test', 'Runs all tests and linting', ['node_tap', 'jshint']);
  grunt.loadNpmTasks('grunt-node-tap');
  grunt.loadNpmTasks('grunt-contrib-jshint');
};
