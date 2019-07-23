const http2 = require('http2')
const {createRequestHandler} = require('@plant/http-adapter')

/**
 * createServer - creates http server instance with Plant as request handler.
 *
 * @param  {Plant} plant Plant instance.
 * @param  {Object} options Node.js HTTPS server options.
 * @return {net.Server} Http server instance ready to listen port.
 * @example
 *
 * const createServer = require('@plant/https')
 * const Plant = require('@plant/plant')
 *
 * const plant = new Plant()
 *
 * plant.use(async ({res}) => {
 *  res.body = 'Hello, World!'
 * })
 *
 * createServer(plant).listen(8080)
 */
function createServer(plant, options = {}) {
  const server = http2.createServer(
    options, createRequestHandler(plant)
  )

  return server
}

exports.createServer = createServer
