/* global describe it before after */

const fs = require('fs')
const net = require('net')

const should = require('should')
const Plant = require('@plant/plant')
const fetch = require('@plant/test-http-suite/fetch-https')
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
    const server = createServer(new Plant(), {
      key,
      cert,
      passphrase,
      rejectUnauthorized: false,
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
      rejectUnauthorized: false,
    })

    after(function() {
      server.close()
    })

    server.listen(0)

    const {status, text} = await fetch(`https://127.0.0.1:${server.address().port}`, {
      rejectUnauthorized: false,
    })

    should(status).be.equal(200)
    should(text).be.equal('Hello')
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
      rejectUnauthorized: false,
    })

    after(function() {
      server.close()
    })

    server.listen(0)

    const {status, text} = await fetch(`https://127.0.0.1:${server.address().port}`, {
      rejectUnauthorized: false,
    })

    should(status).be.equal(200)
    should(text).be.equal('Hello')

    should(ssl).be.an.Object()
    .and.hasOwnProperty('peerCert')
  })
})
