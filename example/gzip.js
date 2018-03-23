const http = require('http');
const zlib = require('zlib');
const Plant = require('..');

const plant = new Plant();

plant.use(async ({res}, next) => {
  // Run underlaying handlers
  await next();

  // Create gzip encoder.
  const gzip = zlib.createGzip();
  // Get response body
  const {body} = res;
  // Set Gzip encoding
  res.headers.set('content-encoding', 'gzip');
  // Replace body with stream
  res.stream(gzip);
  // Write data to gzip and close stream.
  gzip.end(body);
});

plant.use(({res}) => {
  // Send text response
  res.text('Hello');
});

http.createServer(plant.handler())
.listen(8080);
