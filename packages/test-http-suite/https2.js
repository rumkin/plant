/* global URL */

const http2 = require('http2')
const fetch = require('./fetch-http2')

function createHttps2(handler, options) {
  const server = http2.createSecureServer(options, handler)

  server.fetch = function(url, requesOptions, host = '127.0.0.1') {
    const address = this.address()

    return fetch(
      new URL(url, new URL(`https://${host}:${address.port}/}`)),
      {
        rejectUnauthorized: false,
        ...requesOptions,
      }
    )
  }

  return server
}

module.exports = createHttps2
