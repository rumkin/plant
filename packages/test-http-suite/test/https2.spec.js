const fs = require('fs')
const should = require('should')

const createServer = require('../https2')

const ssl = {
  key: fs.readFileSync(__dirname + '/ssl/key.pem'),
  cert: fs.readFileSync(__dirname + '/ssl/cert.pem'),
}

module.exports = ({describe, it}) => {
  describe('HTTPS2', () => {
    it('Should handle request', async () => {
      const server = createServer((req, res) => {
        res.end('Hello, World')
      }, ssl)

      server.listen(0)

      try {
        const res = await server.fetch('/')
        should(res.status).be.equal(200)
        should(res.text).be.equal('Hello, World')
      }
      finally {
        server.close()
      }
    })

    it('Should parse JSON', async () => {
      const server = createServer((req, res) => {
        res.end(JSON.stringify({hello: 'world'}))
      }, ssl)

      server.listen(0)

      try {
        const res = await server.fetch('/')
        should(res.status).be.equal(200)
        should(res.json).be.deepEqual({hello: 'world'})
      }
      finally {
        server.close()
      }
    })
  })
}
