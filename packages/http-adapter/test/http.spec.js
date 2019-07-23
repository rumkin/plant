const createHttpServer = require('@plant/test-http/http')
const createTest = require('./test-suite')

const httpHandler = require('..')

function createServer(plant, options) {
  return createHttpServer(httpHandler(plant, options), options)
}

createTest('HTTP', createServer)
