/* global describe it URL */
const should = require('should')

const Plant = require('..')
const {Request, Response, Peer, URI, Socket} = Plant

async function errorTrap(ctx, next) {
  try {
    await next()
  }
  catch (err) {
    /* eslint-disable-next-line no-console */
    console.error(err)
    throw err
  }
}

function createCtx({req, res, peer, socket, ...ctx} = {}) {
  if (!res) {
    res = new Response({
      url: req.url,
    })
  }

  if (! peer) {
    peer = new Peer({
      uri: new URI({
        protocol: 'process:',
        hostname: process.pid,
      }),
    })
  }

  if (!socket) {
    socket = new Socket({
      peer,
    })
  }

  return {
    req, res, socket, ...ctx,
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

  it('Should serve "/" as route "/"', async () => {
    const plant = new Plant()

    plant.use('/', ({res}) => res.body = 'Hello, World')

    const req = new Request({
      url: new URL('http://localhost/'),
    })

    const res = new Response()

    await plant.getHandler()({req, res})

    should(res.body).be.equal('Hello, World')
  })

  it('Should not serve "/x" as route "/"', async () => {
    const plant = new Plant()

    plant.use('/', ({res}) => res.body = 'Hello, World')

    const req = new Request({
      url: new URL('http://localhost/x'),
    })

    const res = new Response()

    await plant.getHandler()({req, res})

    should(res.body).be.equal(null)
  })

  it('Should serve "/" as route "/*"', async () => {
    const plant = new Plant()

    plant.use('/*', ({res}) => res.body = 'Hello, World')

    const req = new Request({
      url: new URL('http://localhost/'),
    })

    const res = new Response()

    await plant.getHandler()({req, res})

    should(res.body).be.equal('Hello, World')
  })

  it('Should serve "/page" as route "/*"', async () => {
    const plant = new Plant()

    plant.use('/*', ({res}) => res.body = 'Hello, World')

    const req = new Request({
      url: new URL('http://localhost/page'),
    })

    const res = new Response()

    await plant.getHandler()({req, res})

    should(res.body).be.equal('Hello, World')
  })

  it('Should serve strict routes', async () => {
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

  it('Should serve complete-only routes', async () => {
    const plant = new Plant()

    ;['a', 'b', 'c']
    .forEach((route) => {
      plant.use('/' + route, ({res}) => res.body = route)
    })

    const req = new Request({
      url: new URL('http://localhost/b-page'),
    })

    const res = new Response()

    await plant.getHandler()({req, res})

    should(res.body).be.equal(null)
  })

  it('Should serve wildcard routes', async () => {
    const plant = new Plant()

    ;['a', 'b', 'c']
    .forEach((route) => {
      plant.use('/' + route + '/*', ({res}) => res.body = route)
    })

    const req = new Request({
      url: new URL('http://localhost/b/page'),
    })

    const res = new Response()

    await plant.getHandler()({req, res})

    should(res.body).be.equal('b')
  })

  it('Should serve nested paths', async () => {
    const plant = new Plant()

    ;['a', 'b', 'c']
    .forEach((route) => {
      plant.use('/page/' + route, ({res}) => res.body = route)
    })

    const req = new Request({
      url: new URL('http://localhost/page/b'),
    })

    const res = new Response()

    await plant.getHandler()({req, res})

    should(res.body).be.equal('b')
  })

  it('Should send pushes if socket supports it', async () => {
    const pushed = []
    const plant = new Plant()

    plant.use('/script.js', ({res}) => {
      res.headers.set('content-type', 'application/javascript')
      res.body = 'console.log("Hello")'
    })

    plant.use('/style.css', ({res}) => {
      res.headers.set('content-type', 'text/css')
      res.body = 'body { font-family: sans-serif }'
    })

    plant.use(({res}) => {
      res.push(new Request({
        url: new URL('/script.js', res.url),
      }))
      res.push(new Request({
        url: new URL('/style.css', res.url),
      }))
      res.body = 'Hello, World!'
    })

    const socket = new Socket({
      peer: new Peer({
        uri: new URI({
          protocol: 'process:',
          hostname: process.pid,
        }),
      }),
      async onPush(response) {
        pushed.push(response)
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
    should(pushed).has.lengthOf(2)
    should(pushed[0]).be.instanceof(Response)
    should(pushed[0].body).be.equal('console.log("Hello")')
    should(pushed[1]).be.instanceof(Response)
    should(pushed[1].body).be.equal('body { font-family: sans-serif }')
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

  describe('Content-Security-Policy', function() {
    it('Should be set by default to Plant.CSP.LOCAL', async () => {
      const plant = new Plant()

      const req = new Request({
        url: new URL('http://localhost/index.html'),
      })

      const ctx = createCtx({req})

      const {res} = await plant.getHandler()(ctx)

      should(res.headers.has('content-security-policy')).be.equal(true)
      should(res.headers.get('content-security-policy')).be.equal(
        "default-src localhost 'unsafe-eval' 'unsafe-inline'; form-action localhost",
      )
    })
  })
})
