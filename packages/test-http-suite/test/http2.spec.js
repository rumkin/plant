const should = require('should')

const createServer = require('../http2')

module.exports = ({describe, it}) => {
  describe('HTTP2', () => {
    it('Should handle request', async () => {
      const server = createServer((req, res) => {
        res.end('Hello, World')
      })

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
      })

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
