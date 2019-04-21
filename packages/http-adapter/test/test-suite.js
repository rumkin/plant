/* global describe */
/* global it */

const should = require('should')
const fs = require('fs')
const streams = require('web-streams-polyfill/ponyfill')

const Plant = require('@plant/plant')

const {ReadableStream} = streams

async function errorTrap(ctx, next) {
  try {
    await next()
  }
  catch (err) {
    console.error(err)
    throw err
  }
}

module.exports = (title, createServer) => describe(title, function() {
  it('Should serve HTTP requests', async function() {
    const server = createServer(Plant.create(
      errorTrap,
      async function({req, res}) {
        res.send(req.headers.get('content-type'))
      }
    ))

    server.listen()

    try {
      const {text} = await server.fetch('/', {
        headers: {
          'content-type': 'text/plain',
        },
      })

      should(text).be.equal('text/plain')
    }
    finally {
      server.close()
    }
  })

  it('Should return buffer response', async function() {
    const server = createServer(Plant.create(
      errorTrap,
      async function({res}) {
        res.body = Buffer.from('hello')
      }
    ))

    server.listen()

    try {
      const {text} = await server.fetch('/', {
        headers: {
          'content-type': 'text/plain',
        },
      })

      should(text).be.equal('hello')
    }
    finally {
      server.close()
    }
  })

  it('Should return 500 response on errors', async function() {
    const server = createServer(Plant.create(
      async function() {
        throw new Error('test')
      }
    ))

    server.listen()

    try {
      const {status} = await server.fetch('/')

      should(status).be.equal(500)
    }
    finally {
      server.close()
    }
  })

  it('Should update to proxy values', async function() {
    const server = createServer(Plant.create(
      errorTrap,
      async function({res, req, peer}) {
        res.json({
          peer: peer.uri.toString(),
          host: req.url.hostname,
        })
      }
    ))

    server.listen()

    try {
      const {json} = await server.fetch('/', {
        headers: {
          'x-forwarded-for': '127.0.0.2',
          'x-forwarded-host': 'www.online',
        },
      })

      should(json).be.instanceOf(Object)
      should(json).has.ownProperty('host').which.equal('www.online')
      should(json).has.ownProperty('peer').which.equal('tcp://127.0.0.2/')
    }
    finally {
      server.close()
    }
  })

  it('Should determine request mime-type', async function() {
    const server = createServer(Plant.create(
      errorTrap,
      async function({req, res}) {
        if (req.is('text/html')) {
          res.send('html')
        }
        else {
          res.send(req.headers.get('content-type'))
        }
      }
    ))

    server.listen()

    try {
      const {text} = await server.fetch('/', {
        headers: {
          'content-type': 'text/html',
        },
      })
      should(text).be.equal('html')
    }
    finally {
      server.close()
    }
  })

  it('Should parse url data and hosts', async function() {
    const plant = new Plant()

    plant.use(errorTrap)
    plant.use(async function({req, res}) {
      const {url} = req

      res.json({
        method: req.method,
        protocol: url.protocol,
        host: url.hostname,
        port: url.port,
        domains: req.domains,
        pathname: req.url.pathname,
        query: {
          json: req.url.searchParams.get('json'),
        },
      })
    })

    const server = createServer(plant)

    server.listen()

    try {
      const {json} = await server.fetch('/request?json=1', {
        headers: {
          'X-Forwarded-Host': 'some.custom.host.test',
        },
      })

      should(json).be.deepEqual({
        method: 'GET',
        protocol: 'http:',
        host: 'some.custom.host.test',
        port: '',
        domains: ['test', 'host', 'custom', 'some'],
        pathname: '/request',
        query: {
          json: '1',
        },
      })
    }
    finally {
      server.close()
    }
  })

  it('Should read body', async function() {
    const server = createServer(Plant.create(
      errorTrap,
      async function({req, res}) {
        res.send(await req.text())
      }
    ))

    server.listen()

    try {
      const {text} = await server.fetch('/', {
        method: 'POST',
        body: 'test',
      })

      should(text).be.equal('test')
    }
    finally {
      server.close()
    }

  })

  it('Should send response headers', async function() {
    const server = createServer(Plant.create(
      errorTrap,
      async function({res}) {
        res.headers.set('content-type', 'application/json')
        res.send(JSON.stringify(null))
      }
    ))

    server.listen()

    try {
      const {headers, json} = await server.fetch('/')
      should(headers['content-type']).is.equal('application/json')
      should(json).be.equal(null)
    }
    finally {
      server.close()
    }
  })

  it('Should make turns with use(h1, h2)', async function() {
    const plant = Plant.new()

    plant.use(errorTrap)

    plant.use(
      async function({req}, next) {
        if (req.url.pathname === '/turn') {
          return await next()
        }
      },
      async function({res}) {
        res.text('turn')
      }
    )
    .use(async function({res}) {
      res.text('last')
    })

    const server = createServer(plant)

    server.listen()

    try {
      const {text} = await server.fetch('/')
      should(text).be.equal('last')
    }
    finally {
      server.close()
    }
  })

  it('Should visit turn defined with use(h1, h2)', async function() {
    const plant = Plant.new()
    .use(errorTrap)
    .use(
      async function({req}, next) {
        if (req.url.pathname === '/turn') {
          return await next()
        }
      },
      async function({res}) {
        res.text('turn')
      }
    )
    .use(
      async function({res}) {
        res.text('last')
      }
    )

    const server = createServer(plant)

    server.listen()
    try {
      const {text} = await server.fetch('/turn')
      should(text).be.equal('turn')
    }
    finally {
      server.close()
    }
  })

  it('Should set cookies', async function() {
    const server = createServer(Plant.create(
      errorTrap,
      async function({res}) {
        res.setCookie('one', 1)
        res.setCookie('two', 2)
        res.empty()
      }
    ))

    server.listen()

    try {
      const {status, headers} = await server.fetch('/')

      // Check header
      should(status).be.equal(200)

      // Check set-cookie headers
      should(headers['set-cookie']).be.deepEqual([
        'one=1; Path=/',
        'two=2; Path=/',
      ])
    }
    finally {
      server.close()
    }
  })

  it('Should get cookies', async function() {
    const plant = Plant.create(
      errorTrap,
      async function({req, res}) {
        res.json({
          cookie: req.cookies.test,
        })
      }
    )

    const server = createServer(plant)
    server.listen()

    try {
      const {json} = await server.fetch('/', {
        headers: {
          'cookie': 'test=1',
        },
      })

      should(json).has.ownProperty('cookie').which.is.equal('1')
    }
    finally {
      server.close()
    }
  })

  it('Should output streams', async function() {
    const server = createServer(Plant.create(
      errorTrap,
      async function({res}) {
        res.send(new ReadableStream({
          start(controller) {
            const fileStream = fs.createReadStream(__filename)
            fileStream.on('data', (chunk) => {
              controller.enqueue(chunk)
            })
            fileStream.on('end', () => {
              controller.close()
            })
          },
        }))
      }
    ))

    server.listen()

    try {
      const {status, text} = await server.fetch('/')
      should(status).be.equal(200)
      should(text).be.equal(fs.readFileSync(__filename, 'utf8'))
    }
    finally {
      server.close()
    }
  })

  it('Should filtrate httpReq', async function() {
    const server = createServer(Plant.create(
      errorTrap,
      async function({res, httpReq}) {
        res.json(typeof httpReq === 'undefined')
      }
    ))

    server.listen()

    try {
      const {status, text} = await server.fetch('/')
      should(status).be.equal(200)
      should(text).be.equal('true')
    }
    finally {
      server.close()
    }
  })

  it('Should filtrate httpRes', async function() {
    const server = createServer(Plant.create(
      errorTrap,
      async function({res, httpRes}) {
        res.json(typeof httpRes === 'undefined')
      }
    ))

    server.listen()

    try {
      const {status, text} = await server.fetch('/')
      should(status).be.equal(200)
      should(text).be.equal('true')
    }
    finally {
      server.close()
    }
  })
})
