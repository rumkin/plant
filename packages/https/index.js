const https = require('https')
const createRequestHandler = require('@plant/http-adapter')

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
  const server = https.createServer(
    options, createRequestHandler(plant, [
      (ctx, next) => {
        const ssl = new SSL(ctx.httpReq.connection)
        return next({...ctx, ssl})
      },
    ])
  )

  return server
}

class SSL {
  constructor(socket) {
    // TODO implement other SSL read methods
    this.getCertificate = socket.getCertificate.bind(socket)
    this.getPeerCertificate = socket.getPeerCertificate.bind(socket)
  }
}

module.exports = createServer
