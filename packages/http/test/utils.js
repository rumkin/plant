const http = require('http');
const fetch = require('node-fetch');

exports.initServer = function initServer(handler) {
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

exports.readStream = function readStream(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
};
