const http = require('http');
const fetch = require('node-fetch');

exports.createServer = function(handler) {
  const server = http.createServer(handler);

  server.fetch = function(url, options, host = '127.0.0.1') {
    const address = this.address();

    return fetch(
      `http://${host}:${address.port}/${url.replace(/^\/+/, '')}`,
      options
    );
  };

  return server;
};
