/* global describe after it */
const net = require('net')

const should = require('should')
const fetch = require('@plant/test-http/fetch-http')
const Plant = require('@plant/plant')

const {createServer} = require('..')

describe('@plant/http', function() {
  it('Should server be instance of net.Server', function() {
    const plant = new Plant()
    const server = createServer(plant)

    should(server).be.instanceOf(net.Server)
  })

  it('Should handle http requests', async function() {
    const plant = new Plant()
    plant.use(({res}) => {
      res.body = 'Hello'
    })

    const server = createServer(plant)
    after(function() {
      server.close()
    })

    server.listen(0)

    const {text} = await fetch(
      new URL(`http://127.0.0.1:${server.address().port}`)
    )

    should(text).be.equal('Hello')
  })
})
