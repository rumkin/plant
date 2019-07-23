const should = require('should')

const createServer = require('../http')

module.exports = ({describe, it}) => {
  describe('HTTP', () => {
    it('Should handle request', async () => {
      const server = createServer((req, res) => {
        res.end('Hello, World')
      })

      server.listen(0)

      try {
        const res = await server.fetch('/index.html')
        should(res.status).be.equal(200)
        should(res.text).be.equal('Hello, World')
        should(res.url.pathname).be.equal('/index.html')
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
        const {status, json} = await server.fetch('/')
        should(status).be.equal(200)
        should(json).be.deepEqual({hello: 'world'})
      }
      finally {
        server.close()
      }
    })

    it('Should receive correct URL', async () => {
      const server = createServer((req, res) => {
        res.end(req.url + '')
      })

      server.listen(0)

      try {
        const {status, text} = await server.fetch('/page?test=true')
        should(status).be.equal(200)
        should(text).be.equal('/page?test=true')
      }
      finally {
        server.close()
      }
    })

    it('Should send body', async () => {
      const server = createServer((req, res) => {
        req.pipe(res)
      })

      server.listen(0)

      try {
        const {status, text} = await server.fetch('/', {
          method: 'POST',
          body: 'Hello',
        })
        should(status).be.equal(200)
        should(text).be.equal('Hello')
      }
      finally {
        server.close()
      }
    })
  })
}
