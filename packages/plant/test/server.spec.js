/* global describe it URL */
const should = require('should')

const Plant = require('..')
const {Request, Response, Socket} = Plant

async function errorTrap(ctx, next) {
  try {
    await next()
  }
  catch (err) {
    console.error(err)
    throw err
  }
}

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

  it('Should return initial context', () => {
    const plant = new Plant()

    const req = new Request({
      url: new URL('http://localhost/index.html'),
    })

    const res = new Response()

    return plant.getHandler()({req, res})
    .then((result) => {
      should(result.req).be.equal(req)
      should(result.res).be.equal(res)
    })
  })

  it('Should serve routes', async () => {
    const plant = new Plant()

    ;['a', 'b', 'c']
    .forEach((route) => {
      plant.use('/' + route, ({res}) => res.body = route)
    })

    const req = new Request({
      url: new URL('http://localhost/b'),
    })

    const res = new Response()

    await plant.getHandler()({req, res})

    should(res.body).be.equal('b')
  })

  it('Should send pushes if socket supports it', async () => {
    let pushed
    const plant = new Plant()

    plant.use('/script.js', ({res}) => {
      res.headers.set('content-type', 'application/javascript')
      res.body = 'console.log("Hello")'
    })

    plant.use(({res}) => {
      res.push(new Request({
        url: new URL('/script.js', res.url),
      }))
      res.body = 'Hello, World!'
    })

    const socket = new Socket({
      async onPush(_pushed) {
        pushed = _pushed
      },
    })

    const req = new Request({
      url: new URL('http://localhost/b'),
    })

    const res = new Response({
      url: req.url,
    })

    await plant.getHandler()({req, res, socket})

    should(res.body).be.equal('Hello, World!')
    should(pushed).be.instanceof(Response)
    should(pushed.body).be.equal('console.log("Hello")')
  })

  describe('Server.route()', function() {
    it('Should create route mathcer', async () => {
      const plant = new Plant()

      ;['a', 'b', 'c']
      .forEach((route) => {
        plant.use(Plant.route('/' + route), ({res}) => res.body = route)
      })

      const req = new Request({
        url: new URL('http://localhost/b'),
      })

      const res = new Response()

      await plant.getHandler()({req, res})

      should(res.body).be.equal('b')
    })
  })
})
