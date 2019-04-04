/* global describe it */
const should = require('should')

const Server = require('..')
const {and} = Server

describe('Plant.Flow', function() {
  describe('Cascade', function() {
    it ('should iterate over `and`', function() {
      let round = 0

      const fn = and(
        async function(ctx, next) {
          round += 1
          should(round).be.equal(1)

          await next()

          should(round).be.equal(3)
        },
        async function(ctx, next) {
          round += 1
          should(round).be.equal(2)

          await next()

          round += 1
        }
      )

      return fn(null, null)
    })
  })
})
