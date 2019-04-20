/* global URL */

const http = require('http')
const fetch = require('./fetch-http')

function createHttp(handler, options) {
  const server = http.createServer(options, handler)

  server.fetch = function(url, requesOptions, host = '127.0.0.1') {
    const address = this.address()

    return fetch(
      new URL(url, new URL(`http://${host}:${address.port}/}`)),
      requesOptions
    )
  }

  return server
}

module.exports = createHttp
