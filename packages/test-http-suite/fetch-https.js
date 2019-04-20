const https = require('https')

function fetch(url, options = {}) {
  return new Promise(function (resolve, reject) {

    const req = https.request({
      ...options,
      url: url.pathname + url.search,
      hostname: url.hostname,
      port: url.port,
    })

    req.on('response', (res) => {
      let chunks = []

      res.on('data', (chunk) => {
        chunks.push(chunk)
      })

      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks),
          get text() {
            return this.body.toString('utf8')
          },
          get json() {
            return JSON.parse(this.text)
          },
        })
      })

      res.on('error', reject)
    })

    req.on('error', reject)

    req.end()
  })
}

module.exports = fetch
