const net = require('net')

const should = require('should')
const Plant = require('@plant/plant')
const {Response} = Plant

const fetch = require('@plant/test-http/fetch-http2')
const {createServer} = require('.')

module.exports = ({describe, it}) => describe('@plant/http2', function() {
  describe('Interface', () => {
    it('Should return an instance of net.Server', function() {
      const plant = new Plant()
      const server = createServer(plant)

      should(server).be.instanceOf(net.Server)
    })
  })

  describe('HTTP2', () => {
    it(
      'Should be able to push',
      useServer,
      async function({runServer}) {
        let canPush = null
        const plant = new Plant()
        plant.use(({res, socket}) => {
          canPush = socket.canPush
          res.body = 'Hello'
        })

        const server = runServer(plant)
        const {text} = await fetch(new URL(
          `http://127.0.0.1:${server.address().port}/`
        ))

        should(text).be.equal('Hello')
        should(canPush).be.equal(true)
      }
    )

    it(
      'Should push',
      useServer,
      async function({runServer}) {
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

        const server = runServer(plant)

        const {text, pushed} = await fetch(
          new URL(`http://127.0.0.1:${server.address().port}/`),
          {
            settings: {
              enablePush: true,
            },
          }
        )

        should(text).be.equal('Hello')
        should(pushed[0]).ownProperty('url')
        should(pushed[0].url.pathname).which.equal('/push-1.txt')
        should(pushed[0].body).be.equal('Push 1')

        should(pushed[1]).ownProperty('url')
        should(pushed[1].url.pathname).which.equal('/push-2.txt')
        should(pushed[1].body).be.equal('Push 2')
      }
    )
  })
})

async function useServer(ctx, next) {
  let server

  try {
    await next({
      ...ctx,
      server,
      runServer(plant) {
        server = createServer(plant)
        server.listen(0)
        return server
      },
    })
  }
  finally {
    server && server.close()
  }
}
