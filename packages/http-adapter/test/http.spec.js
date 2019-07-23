const createHttpServer = require('@plant/test-http/http')
const createTest = require('./test-suite')

const {createRequestHandler} = require('..')

function createServer(plant, options) {
  return createHttpServer(createRequestHandler(plant, options), options)
}

createTest('HTTP', createServer)
