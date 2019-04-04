/* global describe it */

const should = require('should')
const {URL} = require('url')

const {Request, Headers} = require('..')
const {ReadableStream} = require('./utils/readable-stream')

describe('Request()', function() {
  it('Should be a function', function() {
    should(Request).be.Function()
  })

  describe('Request#is()', function() {
    it('Should use values from Request#headers', function() {
      const req = new Request({
        url: new URL('http://localhost/'),
        headers: new Headers({
          'content-type': 'text/html',
        }),
        body: null,
      })

      should(req.is('text/html')).be.equal(true)
      should(req.is('application/json')).be.equal(false)
    })
  })

  describe('Request#type()', function() {
    it('Should return "application/json" for "application/json" content type', function() {
      const req = new Request({
        url: new URL('http://localhost/'),
        headers: new Headers({
          'content-type': 'application/json;charset=utf8',
        }),
        body: null,
      })

      const type = req.type(['text/html', 'application/json'])

      should(type).be.a.String().and.be.equal('application/json')
    })

    it('Should return "json" for "application/json" content type', function() {
      const req = new Request({
        url: new URL('http://localhost/'),
        headers: new Headers({
          'content-type': 'application/json;charset=utf8',
        }),
        body: null,
      })

      const type = req.type(['text/html', 'json'])

      should(type).be.a.String().and.be.equal('json')
    })

    it('Should return `null` for not an "application/json" content type', function() {
      const req = new Request({
        url: new URL('http://localhost/'),
        headers: new Headers({
          'content-type': 'application/json',
        }),
        body: null,
      })

      const type = req.type(['html', 'video'])

      should(type).be.equal(null)
    })

    ;[
      'image/gif',
      'image/png',
      'image/jpg',
      'image/jpeg',
    ]
    .map(function (type) {
      it('Should return "image" for "' + type + '" content type', function() {
        const req = new Request({
          url: new URL('http://localhost/'),
          headers: new Headers({
            'content-type': type,
          }),
          body: null,
        })

        const result = req.type(['image'])

        should(result).be.a.String().and.be.equal('image')
      })
    })
  })

  describe('Request#accept()', function() {
    it('Should return "json" for "application/json" accept value', function() {
      const req = new Request({
        url: new URL('http://localhost/'),
        headers: new Headers({
          'accept': 'application/json',
        }),
        body: null,
      })

      const type = req.accept(['html', 'json'])

      should(type).be.a.String().and.be.equal('json')
    })

    it('Should return `null` for not an "application/json" accept type', function() {
      const req = new Request({
        url: new URL('http://localhost/'),
        headers: new Headers({
          'accept': 'application/json',
        }),
      })

      const type = req.accept(['html', 'video'])

      should(type).be.equal(null)
    })
  })

  describe('Request#text()', function() {
    it('Should receive data from readable stream', function() {
      const req = new Request({
        url: new URL('http://localhost/'),
        body: new ReadableStream([
          Buffer.from('Hello', 'utf8'),
        ]),
      })

      return req.text()
      .then((text) => {
        should(text).be.equal('Hello')
      })
    })
  })

  describe('Request#json()', function() {
    it('Should receive Object from readable stream', function() {
      const req = new Request({
        url: new URL('http://localhost/'),
        body: new ReadableStream([
          Buffer.from('[{"value": true}]', 'utf8'),
        ]),
      })

      return req.json()
      .then((json) => {
        should(json).be.Array().and.be.deepEqual([{value: true}])
      })
    })
  })
})
