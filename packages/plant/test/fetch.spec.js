/* global describe it */
const should = require('should')

const Plant = require('..')
const {Response, Request} = Plant

describe('fetch()', () => {
  it('should return response',
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

  it('should work with built-in router',
    async () => {
      const plant = new Plant()

      plant.use('/subrequest', ({res}) => {
        res.body = 'Subrequest'
      })

      plant.use(async ({res, fetch}) => {
        const subResponse = await fetch({
          url: '/subrequest',
        })

        res.body = 'Hello, ' + subResponse.body + '!'
      })

      const req = new Request({
        url: new URL('http://localhost/'),
      })
      const res = new Response()

      await plant.getHandler()({req, res})

      should(res.body).be.equal('Hello, Subrequest!')
    }
  )
})
