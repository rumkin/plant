/* global URL */

const http2 = require('http2')
const fetch = require('./fetch-http2')

function createHttp2(handler, options) {
  const server = http2.createServer(options, handler)

  server.fetch = function(url, requesOptions, host = '127.0.0.1') {
    const address = this.address()

    return fetch(
      new URL(url, new URL(`http://${host}:${address.port}/}`)),
      requesOptions
    )
  }

  return server
}

module.exports = createHttp2
