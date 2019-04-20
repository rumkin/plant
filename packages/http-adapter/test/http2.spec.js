const createHttpServer = require('@plant/test-http-suite/http2')
const createTest = require('./test-suite')

const httpHandler = require('..')

function createServer(plant, options) {
  return createHttpServer(httpHandler(plant), options)
}

createTest('HTTP2', createServer)
