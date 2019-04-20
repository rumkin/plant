const http2 = require('http2')

function fetch(url, options = {}) {
  return new Promise(function (resolve, reject) {
    let headers
    let chunks = []
    const pushed = {}

    const client = http2.connect(new URL(
      '/', url
    ), options)

    client.on('error', reject)

    client.on('stream', (pushedStream, requestHeaders) => {
      let pushChunks = []
      const push = {
        get text() {
          return this.body.toString('utf8')
        },
      }
      pushedStream.on('push', (responseHeaders) => {
        push.status = parseInt(responseHeaders[':status'], 10)
        push.headers = {...requestHeaders, ...responseHeaders}
      })
      pushedStream.on('data', (chunk) => {
        pushChunks.push(chunk)
      })
      pushedStream.on('end', () => {
        push.body = Buffer.concat(pushChunks).toString('utf8')
        pushed.push(push)
      })
    })

    const req = client.request({
      ':path': url.pathname + url.search,
      ...(options.headers || {}),
    })

    req.on('response', (_headers) => {
      headers = {..._headers}
    })

    req.on('data', (chunk) => {
      chunks.push(chunk)
    })

    req.on('end', () => {
      resolve({
        status: parseInt(headers[':status'], 10),
        headers,
        body: Buffer.concat(chunks),
        get text() {
          return this.body.toString('utf8')
        },
        pushed,
      })
      client.close()
    })

    req.on('error', reject)

    req.end()
  })
}

module.exports = fetch
