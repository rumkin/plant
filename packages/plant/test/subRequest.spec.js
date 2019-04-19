/* global describe it */
const should = require('should')

const Plant = require('..')
const {Response, Request, Socket} = Plant

describe('subRequest()', () => {
  it('should return response on subRequest#send()',
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

      plant.use(async ({req, res, subRequest}) => {
        const subResponse = await subRequest({
          url: new URL('/', req.url),
        })
        .send()

        res.body = 'Hello, ' + subResponse.body + '!'
      })

      const req = new Request({
        url: new URL('http://localhost/some-path'),
      })

      const res = new Response()

      await plant.getHandler()({req, res})

      should(res.body).be.equal('Hello, Subrequest!')
    }
  )

  it('should call push on subRequest#push()',
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

      plant.use(async ({req, res, subRequest}) => {
        await subRequest({
          url: new URL('/', req.url),
        })
        .push()

        res.body = 'Ok!'
      })

      const req = new Request({
        url: new URL('http://localhost/some-path'),
      })

      const res = new Response()
      let pushedRes = null
      const socket = new Socket({
        onPush(_pushedRes) {
          pushedRes = _pushedRes
          return Promise.resolve()
        },
      })

      await plant.getHandler()({req, res, socket})

      should(pushedRes).be.not.equal(null)
      should(pushedRes).has.ownProperty('body').which.equal('Subrequest')

      should(res.body).be.equal('Ok!')
    }
  )
})
