/* global describe it */
const should = require('should')

const Plant = require('..')
const {Response, Request} = Plant

describe('fetch()', () => {
  it('should return response on fetch#send()',
    async () => {
      const plant = new Plant()

      plant.use(({req, res}, next) => {
        if (req.url.pathname !== '/') {
          return next()
        }
        else {
          res.body = 'Subrequest'
        }
      })

      plant.use(async ({req, res, fetch}) => {
        const subResponse = await fetch({
          url: new URL('/', req.url),
        })

        res.body = 'Hello, ' + subResponse.body + '!'
      })

      const req = new Request({
        url: new URL('http://localhost/test'),
      })
      const res = new Response()

      await plant.getHandler()({req, res})

      should(res.body).be.equal('Hello, Subrequest!')
    }
  )
})
