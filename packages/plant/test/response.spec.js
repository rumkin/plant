/* global describe it */
const should = require('should')

const {Response} = require('..')

describe('Response()', function() {
  it('Should be a function', function() {
    should(Response).be.a.Function()
  })

  describe('Response.json()', function() {
    it('Should convert value to json string', function() {
      const res = new Response()

      res.json({a: 1})

      should(res.body).be.a.String().and.equal('{"a":1}')
    })

    it('Should set proper content-length header', function() {
      const res = new Response()

      res.json({a: 1})

      should(res.headers.get('content-length')).be.equal('7')
    })

    it('Should set content-type header to "application/json"', function() {
      const res = new Response()

      res.json({a: 1})

      should(res.headers.get('content-type')).be.equal('application/json')
    })
  })

  describe('Response.text()', function() {
    it('Should return same string', function() {
      const res = new Response()

      res.text('Hello, World!')

      should(res.body).be.a.String().and.equal('Hello, World!')
    })

    it('Should set proper content-length header', function() {
      const res = new Response()

      res.text('Hello, World!')

      should(res.headers.get('content-length')).be.equal('13')
    })

    it('Should set content-type header to "text/plain"', function() {
      const res = new Response()

      res.text('Hello, World!')

      should(res.headers.get('content-type')).be.equal('text/plain')
    })
  })

  describe('Response.html()', function() {
    it('Should return same string', function() {
      const res = new Response()

      res.html('<html/>')

      should(res.body).be.a.String().and.equal('<html/>')
    })

    it('Should set proper content-length header', function() {
      const res = new Response()

      res.html('<html/>')

      should(res.headers.get('content-length')).be.equal('7')
    })

    it('Should set content-type header to "text/html"', function() {
      const res = new Response()

      res.html('<html/>')

      should(res.headers.get('content-type')).be.equal('text/html')
    })
  })

  describe('Response.body', function() {
    it('Should accept string', function() {
      const res = new Response()

      res.body = 'Hello'

      should(res.body).be.a.String().and.equal('Hello')
    })

    it('Should set proper content-length header with string', function() {
      const res = new Response()

      res.body = 'Hello'

      should(res.headers.get('content-length')).be.equal('5')
    })

    it('Should accept Byffer', function() {
      const res = new Response()

      res.body = Buffer.from('Hello')

      should(res.body).be.instanceof(Buffer)
      should(res.body.toString('utf8')).be.equal('Hello')
    })

    it('Should set proper content-length header', function() {
      const res = new Response()

      res.body = Buffer.from('Hello')

      should(res.headers.get('content-length')).be.equal('5')
    })
  })

  describe('Response#statusText', function() {
    it('Should return "OK" by default', function() {
      const res = new Response()

      should(res.statusText).be.equal('OK')
    })

    it('Should return "Not Found" for 404', function() {
      const res = new Response({
        status: 404,
      })

      should(res.statusText).be.equal('Not Found')
    })

    it('Should return "Internal Server Error" for 500', function() {
      const res = new Response({
        status: 500,
      })

      should(res.statusText).be.equal('Internal Server Error')
    })
  })

  describe('Response#redirected', function() {
    it('Should be `true` if status is 301', function() {
      const res = new Response({
        status: 301,
      })

      should(res.redirected).be.equal(true)
    })

    it('Should be `false` if status is 200', function() {
      const res = new Response({
        status: 200,
      })

      should(res.redirected).be.equal(false)
    })

    it('Should be `false` if status is 0', function() {
      const res = new Response({
        status: 0,
      })

      should(res.redirected).be.equal(false)
    })
  })
})
