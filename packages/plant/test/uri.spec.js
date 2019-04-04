/* global describe it */
const should = require('should')

const {URI} = require('..')

describe('URI()', function() {
  it('Should be a function', function() {
    should(URI).be.a.Function()
  })

  describe('URI.toString()', function() {
    it('Should convert string with protocol, hostname and port', function() {
      const uri = new URI({
        protocol: 'tcp:',
        hostname: '127.0.0.1',
        port: '12345',
      })

      should(uri.toString()).be.equal('tcp://127.0.0.1:12345/')
    })

    it('Should convert string with protocol and hostname', function() {
      const uri = new URI({
        protocol: 'tcp:',
        hostname: '127.0.0.1',
      })

      should(uri.toString()).be.equal('tcp://127.0.0.1/')
    })

    it('Should convert string with hostname and port', function() {
      const uri = new URI({
        hostname: '127.0.0.1',
        port: '12345',
      })

      should(uri.toString()).be.equal('//127.0.0.1:12345/')
    })
  })
})
