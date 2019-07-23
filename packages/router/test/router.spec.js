/* global describe it */
const should = require('should')

const {and} = require('@plant/flow')
const Plant = require('@plant/plant')

const {Request, Response, Route, Socket, Peer, URI} = Plant

const Router = require('..')

function createContext(url) {
  const socket = new Socket()

  const req = new Request({
    url: new URL(url),
  })

  const res = new Response({
    url: req.url,
  })

  const peer = new Peer({
    uri: new URI({
      protocol: 'process:',
      hostname: process.pid,
    }),
  })

  const route = new Route({
    path: req.url.pathname,
  })

  return {req, res, socket, peer, route}
}

describe('Router()', function(){
  it('Should get params from req.url', async function() {
    const router = new Router()

    router.get('/users/:id', async function({res, route}) {
      res.send(route.params.id)
    })

    const res = new Response()
    const ctx = createContext('http://localhost:8080/users/1')
    await and(router.getHandler())({
      ...ctx,
      res,
    })

    should(res.body).be.a.String().and.equal('1')
  })

  it('should define several method handlers with addRoute()', async function() {
    const router = new Router()

    router.addRoute(['post', 'get'], '/users', async function({res}) {
      res.send('1')
    })

    const res = new Response()
    const ctx = createContext('http://localhost:8080/users')
    await and(router.getHandler())({
      ...ctx,
      res,
    })

    should(res.body).be.a.String().and.equal('1')
  })

  it('should use subrouter', async function() {
    const router = new Router()

    router.use('/users/*', Router.create((r) => {
      r.get('/:id', async function({res, route}) {
        res.send(route.params.id)
      })
    }))

    const res = new Response()
    const ctx = createContext('http://localhost:8080/users/2')
    await and(router.getHandler())({
      ...ctx,
      res,
    })

    should(res.body).be.a.String().and.equal('2')
  })

  it('should use nested subrouters', async function() {
    const router1 = new Router()
    const router2 = new Router()
    const router3 = new Router()

    router3.get('/param/:param', async function({req, res, route}) {
      res.json({
        ...route.params,
        raw: req.url.searchParams.has('raw'),
      })
    })

    router2.use('/users/:user/*', router3)
    router1.use('/api/*', router2)

    const res = new Response()
    const ctx = createContext('http://localhost:8080/api/users/3/param/id?raw')
    await and(router1.getHandler())({
      ...ctx,
      res,
    })

    const result = JSON.parse(res.body)

    should(result).has.ownProperty('user').which.is.equal('3')
    should(result).has.ownProperty('param').which.is.equal('id')
    should(result).has.ownProperty('raw').which.is.equal(true)
  })

  it('Should work with route provided by Plant', async () => {
    const plant = new Plant()
    const router = new Router()

    router.get('/users/:id', async function({res, route}) {
      res.send(route.params.id)
    })

    plant.use('/api/v1/*', router)

    const res = new Response()
    const req = new Request({
      url: new URL('http://localhost/api/v1/users/111'),
    })

    await plant.getHandler()({
      req,
      res,
      peer: new Peer(new URI({
        protocol: 'process',
        hostname: process.pid,
      })),
    })

    should(res.body).be.equal('111')
  })

  describe('Router#before()', function() {
    it('Should add handler for custom route', async () => {
      const router = new Router()

      router.before(async (ctx, next) => {
        return next({
          ...ctx,
          before: true,
        })
      })

      router.use((ctx) => {
        const {res, before} = ctx

        res.json(before)
      })

      const ctx = createContext('http://localhost:8080/')
      await and(router.getHandler())(ctx)
      const {res} = ctx

      should(res.body).be.a.String().and.equal('true')
    })

    it('Should not be called if route url does not match', async () => {
      const router = new Router()
      let hasRun = false
      router.before(async (ctx, next) => {
        hasRun = true
        return next({
          ...ctx,
          before: true,
        })
      })

      router.get('/some-route', (ctx) => {
        const {res, before} = ctx

        res.json(before)
      })

      const ctx = createContext('http://localhost:8080/')
      await and(router.getHandler())(ctx)

      should(hasRun).be.equal(false)
    })
  })
})
