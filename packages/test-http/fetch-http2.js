const http2 = require('http2')

function fetch(url, {body, headers = {}, ...options} = {}) {
  return new Promise(function (resolve, reject) {
    let chunks = []
    const response = {
      headers: {}
    }
    const pushed = []

    const client = http2.connect(
      new URL('/', url), options
    )

    client.on('error', reject)

    client.on('stream', (pushedStream, requestHeaders) => {
      let pushChunks = []
      const push = {
        url: new URL(requestHeaders[':path'], url),
        get text() {
          return this.body.toString('utf8')
        },
        get json() {
          return JSON.parse(this.text)
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
      ...headers,
    }, {
      endStream: !!body ? false : true,
    })

    req.on('response', (_headers) => {
      response.headers = {..._headers}
    })

    req.on('data', (chunk) => {
      chunks.push(chunk)
    })

    req.on('end', () => {
      resolve({
        url,
        status: parseInt(response.headers[':status'], 10),
        headers: response.headers,
        body: Buffer.concat(chunks),
        get text() {
          return this.body.toString('utf8')
        },
        get json() {
          return JSON.parse(this.text)
        },
        pushed,
      })
      client.close()
    })

    req.on('error', reject)
    if (body) {
      req.write(body)
    }
    req.end()
  })
}

module.exports = fetch
