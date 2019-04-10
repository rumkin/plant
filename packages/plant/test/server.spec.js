/* global describe it URL */
const should = require('should')

const Plant = require('..')
const {Request, Response} = Plant

async function errorTrap(ctx, next) {
  try {
    await next()
  }
  catch (err) {
    console.error(err)
    throw err
  }
}

// TODO Rewrite tests.

describe('Server()', function() {
  it('Should serve requests', function() {
    const handler = Plant.handler(
      errorTrap,
      async function({req, res}) {
        res.headers.set('content-type', req.headers.get('accept'))
        res.body = req.url.pathname
      }
    )

    const req = new Request({
      url: new URL('http://localhost/index.html'),
      method: 'GET',
      headers: {
        'accept': 'text/plain',
      },
    })

    const res = new Response()

    return handler({req, res})
    .then(() => {
      should(res.headers.get('content-type')).be.equal('text/plain')
      should(res.body).be.equal('/index.html')
    })
  })
})
