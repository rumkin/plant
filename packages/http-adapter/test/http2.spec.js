const createHttpServer = require('@plant/test-http/http2')
const createTest = require('./test-suite')

const {createRequestHandler} = require('..')

function createServer(plant, options) {
  return createHttpServer(createRequestHandler(plant, options), options)
}

createTest('HTTP2', createServer)
