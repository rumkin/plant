/* global describe it */
const should = require('should')

const {Response} = require('..')

describe('Response()', function() {
  it('Should be a function', function() {
    should(Response).be.a.Function()
  })

  describe('Response.json()', function() {
    it('Should convert  value to json string', function() {
      const res = new Response()

      res.json({a: 1})

      should(res.body).be.a.String().and.equal('{"a":1}')
      should(res.headers.get('content-type')).be.equal('application/json')
    })
  })
})
