const should = require('should');
const {URL} = require('url');

const {Request, Headers} = require('..');

describe('Request()', function() {
  it('Should be a function', function() {
    should(Request).be.Function();
  });

  describe('Request.is()', function() {
    it('Should use values from Request.headers', function() {
      const req = new Request({
        url: new URL('http://localhost/'),
        headers: new Headers({
          'content-type': 'text/html',
        }),
        body: null,
      });

      should(req.is('html')).be.equal(true);
      should(req.is('json')).be.equal(false);
    });
  });

  describe('Request.type()', function() {
    it('Should return "json" for "application/json" content type', function() {
      const req = new Request({
        url: new URL('http://localhost/'),
        headers: new Headers({
          'content-type': 'application/json',
        }),
        body: null,
      });

      const type = req.type(['html', 'json']);

      should(type).be.a.String().and.be.equal('json');
    });

    it('Should return `null` for not a "application/json" content type', function() {
      const req = new Request({
        url: new URL('http://localhost/'),
        headers: new Headers({
          'content-type': 'application/json',
        }),
        body: null,
      });

      const type = req.type(['html', 'video']);

      should(type).be.equal(null);
    });
  });
});
