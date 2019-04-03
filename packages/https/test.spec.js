/* global describe it before after */

const fs = require('fs')
const net = require('net')

const should = require('should')
const fetch = require('node-fetch')
const Plant = require('@plant/plant')

const createServer = require('.')

const passphrase = '12345678'
let key
let cert

describe('@plant/https', function() {
  before(function() {
    key = fs.readFileSync(__dirname + '/var/key.pem')
    cert = fs.readFileSync(__dirname + '/var/cert.pem')
  })

  it('Should server be instance of net.Server', function() {
    const plant = new Plant()
    const server = createServer(plant, {
      key,
      cert,
      passphrase,
    })

    should(server).be.instanceOf(net.Server)
  })

  it('Should handle http requests', async function() {
    const plant = new Plant()
    plant.use(({res}) => {
      res.body = 'Hello'
    })

    const server = createServer(plant, {
      key,
      cert,
      passphrase,
    })

    after(function() {
      server.close()
    })

    server.listen(0)

    const res = await fetch(`https://127.0.0.1:${server.address().port}`)
    const body = await res.text()

    should(body).be.equal('Hello')
  })

  it('Should add ssl context variable', async function() {
    const plant = new Plant()
    let ssl = null

    plant.use(({res, ssl: _ssl}) => {
      ssl = _ssl
      res.body = 'Hello'
    })

    const server = createServer(plant, {
      key,
      cert,
      passphrase,
    })

    after(function() {
      server.close()
    })

    server.listen(0)

    const res = await fetch(`https://127.0.0.1:${server.address().port}`)
    const body = await res.text()

    should(body).be.equal('Hello')
    should(ssl).be.an.Object()
    .and.hasOwnProperty('getPeerCertificate')
  })
})
