var connect = require('connect'),
    http = require('http');

var app = connect()
  .use(connect.static('test'))
  .use(connect.directory('test'));

http.createServer(app).listen(3000);

var lib = connect()
  .use(connect.static('lib'));

http.createServer(lib).listen(3001);
