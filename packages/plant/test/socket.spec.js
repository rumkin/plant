/* global describe it */
const should = require('should')

const {Socket, Peer, URI} = require('..')

describe('Socket()', function() {
  it('Should be a function', function() {
    should(Socket).be.a.Function()
  })

  describe('Socket.end()', function() {
    it('Should set isEnded `true`', function() {
      const socket = new Socket({
        peer: new Peer({
          uri: new URI({
            protocol: 'process:',
            hostname: process.pid,
          }),
        }),
      })

      should(socket.isEnded).be.False()
      socket.end()
      should(socket.isEnded).be.True()
    })
  })
})
