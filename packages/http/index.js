const http = require('http');
const createRequestHandler = require('@plant/http-adapter');

/**
 * createServer - creates http server instance with Plant as request handler.
 *
 * @param  {Plant} plant Plant instance.
 * @return {net.Server} Http server instance ready to listen port.
 * @example
 *
 * const createServer = require('@plant/http');
 * const Plant = require('@plant/plant');
 *
 * const plant = new Plant();
 *
 * plant.use(async ({res}) => {
 *  res.body = 'Hello, World!';
 * });
 *
 * createServer(plant).listen(8080);
 */
function createServer(plant) {
  const server = http.createServer(
    createRequestHandler(plant)
  );

  return server;
}

module.exports = createServer;
