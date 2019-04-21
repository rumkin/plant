/* global describe it URL */
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

  const peer = new Peer({
    uri: new URI({
      protocol: 'process:',
      hostname: process.pid,
    }),
  })

  const route = new Route({
    path: req.url.pathname,
    basePath: '/',
    params: {},
  })

  return {req, socket, peer, route}
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

    router.route('/users', Router.create({
      'GET /:id': async function({res, route}) {
        res.send(route.params.id)
      },
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

    router2.route('/users/:user', router3)
    router1.route('/api', router2)

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

    plant.use('/api/v1', router)

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
})
