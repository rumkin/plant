const assert = require('assert')

const Server = require('..')
const {and, or, getHandler} = Server

module.exports = ({describe, it}) => describe('Plant.Flow', function() {
  describe('Cascade', function() {
    describe('and()', () => {
      it ('should iterate over `and`', async function() {
        let round = 0

        const fn = and(
          async function(ctx, next) {
            round += 1
            assert.equal(round, 1)

            await next()

            assert.equal(round, 3)
          },
          async function(ctx, next) {
            round += 1
            assert.equal(round, 2)

            await next()
            // eslint-disable-next-line require-atomic-updates
            round += 1
          }
        )

        await fn(null, null)

        assert.equal(round, 3)
      })
    })

    describe('or()', () => {
      it('Should stop when res.hasBody is `true`', async () => {
        const res = {
          hasBody: false,
        }
        const socket = {
          isEnded: false,
        }

        let i = 0

        await or(
          async function(ctx) {
            ctx.res.hasBody = true
            i++
          },
          async function() {
            i++
          },
        )({res, socket})

        assert.equal(i, 1)
      })

      it('Should stop when socket.isEnded is `true`', async () => {
        const res = {
          hasBody: false,
        }
        const socket = {
          isEnded: false,
        }

        let i = 0

        await or(
          async function(ctx) {
            ctx.socket.isEnded = true
            i++
          },
          async function() {
            i++
          },
        )({res, socket})

        assert.equal(i, 1)
      })

      it('Should iterate till the end', async () => {
        const res = {
          hasBody: false,
        }
        const socket = {
          isEnded: false,
        }

        let i = 0

        await or(
          async function() {
            i++
          },
          async function(ctx) {
            i++
            ctx.res.hasBody = true
          },
        )({res, socket})

        assert.equal(i, 2)
      })

      it('Should continue iteration if no matches found', async () => {
        const res = {
          hasBody: false,
        }
        const socket = {
          isEnded: false,
        }

        let i = 0

        await or(
          async function() {
            i++
          },
          async function() {
            i++
          },
        )({res, socket}, () => {
          i++
        })

        assert.equal(i, 3)
      })
    })

    describe('getHandler()', () => {
      it('Should call .getHandler() of object', () => {
        let i = 0

        getHandler({
          getHandler() {
            i++
            return () => {}
          },
        })

        assert(i, 1)
      })
    })
  })
})
