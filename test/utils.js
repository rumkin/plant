const http = require('http');
const fetch = require('node-fetch');

exports.createServer = function(handler) {
  const server = http.createServer(handler);

  server.fetch = function(url, options) {
    const address = this.address();

    return fetch(
      `http://127.0.0.1:${address.port}/${url.replace(/^\/+/, '')}`,
      options
    );
  };

  return server;
};

exports.readStream = function(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => {
      chunks.push(chunk);
    });

    stream.on('end', () => {
      resolve(Buffer.concat(chunks).toString());
    });

    stream.on('error', reject);
  });
};
