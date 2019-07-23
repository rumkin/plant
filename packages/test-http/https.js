/* global URL */

const https = require('https')
const fetch = require('./fetch-https')

function createHttps(handler, options) {
  const server = https.createServer(options, handler)

  server.fetch = function(url, requesOptions, host = 'localhost') {
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

module.exports = createHttps
