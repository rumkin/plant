const https = require('https')

function fetch(url, {body, ...options} = {}) {
  return new Promise(function (resolve, reject) {

    const req = https.request(url + '', options)

    req.on('response', (res) => {
      let chunks = []

      res.on('data', (chunk) => {
        chunks.push(chunk)
      })

      res.on('end', () => {
        resolve({
          url,
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

    if (body) {
      req.write(body)
    }

    req.end()
  })
}

module.exports = fetch
