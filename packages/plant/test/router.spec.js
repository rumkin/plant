const should = require('should');

const {Router, Request, Response, Socket, and} = require('..');

describe('Router()', function(){
  it('Should get params from req.url', async function() {
    const router = new Router();

    router.get('/users/:id', async function({req, res}) {
      res.send(req.params.id);
    });

    const socket = new Socket();

    const req = new Request({
      url: 'http://localhost:8080/users/1',
    });

    const res = new Response();

    await and(router.handler())({req, res, socket});

    should(res.body).be.a.String().and.equal('1');
  });

  it('should define several method handlers with addRoute()', async function() {
    const router = new Router();

    router.addRoute(['post', 'get'], '/users/', async function({res}) {
      res.send('1');
    });

    const socket = new Socket();

    const req = new Request({
      url: 'http://localhost:8080/users',
    });
    const res = new Response();

    await and(router.handler())({req, res, socket});

    should(res.body).be.a.String().and.equal('1');
  });

  it('should use subrouter', async function() {
    const router = new Router();

    router.route('/users/', Router.handler({
      'GET /:id': async function({req, res}) {
        res.send(req.params.id);
      },
    }));

    const socket = new Socket();

    const req = new Request({
      url: 'http://localhost:8080/users/2',
    });

    const res = new Response();

    await and(router.handler())({req, res, socket});

    should(res.body).be.a.String().and.equal('2');
  });

  it('should use nested subrouters', async function() {
    const router1 = new Router();
    const router2 = new Router();
    const router3 = new Router();

    router3.get('/param/:param', async function({req, res}) {
      res.json({
        ...req.params,
        raw: req.url.searchParams.has('raw'),
      });
    });

    router2.route('/users/:user/', router3);
    router1.route('/api/', router2);

    const socket = new Socket();

    const req = new Request({
      url: 'http://localhost:8080/api/users/3/param/id?raw',
    });

    const res = new Response();

    await and(router1.handler())({req, res, socket});

    const result = JSON.parse(res.body);

    should(result).has.ownProperty('user').which.is.equal('3');
    should(result).has.ownProperty('param').which.is.equal('id');
    should(result).has.ownProperty('raw').which.is.equal(true);
  });
});
