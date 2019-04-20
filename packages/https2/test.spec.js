const fs = require('fs')
const net = require('net')

const should = require('should')
const Plant = require('@plant/plant')
const {Response} = Plant

const fetch = require('@plant/test-http-suite/fetch-http2')
const createServer = require('.')

module.exports = ({describe, use, it}) => describe('@plant/https2', function() {
  use(function(ctx, next) {
    return next({
      ...ctx,
      ssl: {
        key: fs.readFileSync(__dirname + '/var/ssl/key.pem'),
        cert: fs.readFileSync(__dirname + '/var/ssl/cert.pem'),
      },
    })
  })

  describe('Interface', () => {
    it('Should return an instance of net.Server', function({ssl}) {
      const plant = new Plant()
      const server = createServer(plant, ssl)

      should(server).be.instanceOf(net.Server)
    })
  })

  describe('SSL', () => {
    it(
      'Should handle request',
      useServer,
      async function({server, usePlant}) {
        const plant = new Plant()
        plant.use(({res}) => {
          res.body = 'Hello'
        })

        usePlant(plant)

        const {text} = await fetch(
          new URL(`https://127.0.0.1:${server.address().port}/`),
          {
            rejectUnauthorized: false,
          }
        )

        should(text).be.equal('Hello')
      }
    )

    it(
      'Should provide ssl certificate',
      useServer,
      async function({server, usePlant}) {
        let cert
        const plant = new Plant()
        plant.use(({res, ssl}) => {
          cert = ssl.getCertificate()
          res.body = ''
        })

        usePlant(plant)

        await fetch(
          new URL(`https://127.0.0.1:${server.address().port}/`),
          {
            rejectUnauthorized: false,
          },
        )

        should(cert).be.an.Object()
        .and.hasOwnProperty('pubkey')

        should(cert.pubkey.toString('base64')).be.equal(`
          MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqHBGvg/7s3rJH8V/97/D
          Lxs1bTgH3jlKH9Y7X6bp7jYEP8qWrGwbzHJtbHK/+e1jAnToZIQx49VVvT2FZktO
          y1G/3oFSMW/xSXk+bKlGDD0hREvMhEhyk1rrwUau366Gs9L1tqPcnOHuI1t9wDQF
          r+HLQwNsumFvLm1JKHJAD9VhZpf92/Y0F2NV8RLacEipPeTQPuZ3aYP+q+5KtGLq
          H23iwh3vdJQTST05eLg+rUNwO9cGoUCL8UbtOnsqQ+dq/0K6xJtCwkDlbWNaA1xd
          MDm9KspK01v+M+hbBEF+bP1NVukQJ1rHKAOzRIJBPI3ezEojo+9Pq4aRIHd1WgFa
          owIDAQAB
          `.replace(/\s/g, '')
        )
      }
    )
  })

  describe('HTTP2', () => {
    it(
      'Should be able to push',
      useServer,
      async function({server, usePlant}) {
        let canPush = null
        const plant = new Plant()
        plant.use(({res, socket}) => {
          canPush = socket.canPush
          res.body = 'Hello'
        })

        usePlant(plant)

        const {text} = await fetch(
          new URL(`https://127.0.0.1:${server.address().port}/`),
          {
            rejectUnauthorized: false,
          },
        )

        should(text).be.equal('Hello')
        should(canPush).be.equal(true)
      }
    )

    it(
      'Should push',
      useServer,
      async function({server, usePlant}) {
        const plant = new Plant()
        plant.use(({res, socket}) => {
          socket.push(
            new Response({
              url: new URL('./push-1.txt', res.url),
              body: 'Push 1',
            })
          )
          socket.push(
            new Response({
              url: new URL('./push-2.txt', res.url),
              body: 'Push 2',
            })
          )
          res.body = 'Hello'
        })

        usePlant(plant)

        const {text, pushed} = await fetch(
          new URL(`https://127.0.0.1:${server.address().port}/`),
          {
            rejectUnauthorized: false,
            settings: {
              enablePush: true,
            },
          }
        )

        should(text).be.equal('Hello')
        should(pushed[0]).ownProperty('url')
        should(pushed[0].url.pathname).which.equal('/push-1.txt')
        should(pushed[0].text).be.equal('Push 1')

        should(pushed[1]).ownProperty('url')
        should(pushed[1].url.pathname).which.equal('/push-2.txt')
        should(pushed[1].text).be.equal('Push 2')
      }
    )
  })
})

async function useServer(ctx, next) {
  let handler

  const server = createServer({
    getHandler() {
      return function(httpCtx) {
        return handler(httpCtx)
      }
    },
  }, {
    rejectUnauthorized: false,
    ...ctx.ssl,
  })

  try {
    server.listen(0)
    await next({
      ...ctx,
      server,
      usePlant(plant) {
        handler = plant.getHandler()
      },
    })
  }
  finally {
    server.close()
  }
}
