/* global describe it */
const should = require('should')

const {Route} = require('..')

describe('Route()', () => {
  describe('#capture()', () => {
    it('Should cut path from Route#path', () => {
      const route = new Route({
        path: '/user/1/album/1',
      })

      route.capture('/user/1')

      should(route.path).be.equal('/album/1')
    })

    it('Should normalize path', () => {
      const route = new Route({
        path: '/user/1/album/1',
      })

      route.capture('user/1/')

      should(route.path).be.equal('/album/1')
    })

    it('Should append path to Route#basePath', () => {
      const route = new Route({
        path: '/user/1/album/1',
      })

      route.capture('/user/1')

      should(route.basePath).be.equal('/user/1')
    })

    it('Should extend Route#params', () => {
      const route = new Route({
        path: '/user/1/album/1',
      })

      route.capture('/user/1', {id: 1})

      should(route.params).be.deepEqual({id: 1})
    })

    it('Should append captured path to Route#captured', () => {
      const route = new Route({
        path: '/user/1/album/1',
      })

      route.capture('/user/1', {id: 1})

      should(route.captured.length).be.equal(1)
      should(route.captured[0]).be.an.Object

      should(route.captured[0]).has.ownProperty('path')
      .which.is.equal('/user/1')

      should(route.captured[0]).has.ownProperty('params')
      .which.is.deepEqual({id: 1})
    })

    it('Should capture path till the end', () => {
      const route = new Route({
        path: '/user/1/album/1',
      })

      route.capture('/user/1', {userId: 1})
      route.capture('/album/1', {albumId: 1})

      should(route.path).be.equal('')
      should(route.basePath).be.equal('/user/1/album/1')
      should(route.params).be.deepEqual({
        userId: 1,
        albumId: 1,
      })
      should(route.captured.length).be.equal(2)
    })
  })
})
