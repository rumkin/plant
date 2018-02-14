const should = require('should');
const fs = require('fs');

const {createServer, readStream} = require('./utils.js');

const Server = require('..');
const {and, or, Router} = Server;

describe('flow', function() {
  it ('should iterate over `and`', function() {
    let round = 0;

    const fn = and(
      async function(ctx, next) {
        round += 1;
        should(round).be.equal(1);

        await next();

        should(round).be.equal(3);
      },
      async function(ctx, next) {
        round += 1;
        should(round).be.equal(2);

        await next();

        round += 1;
      }
    );

    return fn(null, null);
  });
});

describe('Server', function() {
  it('should serve requests', function() {
    const server = createServer(Server.handler(
      async function({req, res}) {
        res.send(req.headers.get('content-type'));
      }
    ));

    server.listen();

    after(function() {
      server.close();
    });

    return server.fetch('/', {
      headers: {
        'content-type': 'text/plain',
      },
    })
    .then((res) => res.text())
    .then((result) => should(result).be.equal('text/plain'));
  });

  it('should update to proxy values', function() {
    const server = createServer(Server.handler(
      async function({req, res}) {
        res.json({
          ip: req.ip,
          host: req.host
        });
      }
    ));

    server.listen();

    after(function() {
      server.close();
    });

    return server.fetch('/', {
      headers: {
        'x-forwarded-for': '127.0.0.2',
        'x-forwarded-host': 'www.online',
      },
    })
    .then((res) => res.json())
    .then((result) => {
      should(result).be.instanceof(Object);
      should(result).has.ownProperty('host').which.equal('www.online');
      should(result).has.ownProperty('ip').which.equal('127.0.0.2');
    });
  });

  it('should determine request mime-type', function() {
    const server = createServer(Server.handler(
      async function({req, res}) {
        if (req.is('html')) {
          res.send('html');
        }
        else {
          res.send(req.headers.get('content-type'));
        }
      }
    ));

    server.listen();

    after(function() {
      server.close();
    });

    return server.fetch('/', {
      headers: {
        'content-type': 'text/html',
      },
    })
    .then((res) => res.text())
    .then((result) => should(result).be.equal('html'));
  });

  it('should parse url data and hosts', function() {
    const plant = new Server();

    plant.use(async function({req, res}) {
      res.json({
        method: req.method,
        protocol: req.protocol,
        host: req.host,
        port: req.port,
        domains: req.domains,
        url: req.url,
        query: req.query,
      });
    });

    const server = createServer(plant.handler());

    server.listen();

    after(function() {
      server.close();
    });

    return server.fetch('/request?json=1', {}, 'localhost')
    .then((res) => res.json())
    .then((result) => should(result).be.deepEqual({
      method: 'get',
      protocol: 'http',
      host: 'localhost',
      port: server.address().port,
      domains: ['localhost'],
      url: '/request',
      query: {
        json: '1',
      },
    }));
  });

  it('should read body', function() {
    const server = createServer(Server.handler(
      async function({req}, next) {
        if (req.method !== 'GET') {
          req.body = await readStream(req);
        }

        await next();
      },
      async function({req, res}) {
        res.send(req.body);
      }
    ));

    server.listen();

    after(function() {
      server.close();
    });

    return server.fetch('/', {
      method: 'POST',
      body: 'test',
    })
    .then((res) => res.text())
    .then((result) => should(result).be.equal('test'));;
  });

  it('should specify response headers', function() {
    const server = createServer(Server.handler(
      async function({res}) {
        res.headers.set('content-type', 'application/json');
        res.send(JSON.stringify(null));
      }
    ));

    server.listen();

    after(function() {
      server.close();
    });

    return server.fetch('/')
    .then((res) => {
      should(res.headers.get('content-type')).is.equal('application/json');
      return res;
    })
    .then((res) => res.json())
    .then((result) => should(result).be.equal(null));
  });

  it('should use or handler', function() {
    const server = createServer(Server.handler(
      or(
        async function() {},
        async function() {},
        async function({res}) {
          res.text('last');
        }
      )
    ));

    server.listen();

    after(function() {
      server.close();
    });

    return server.fetch('/')
    .then((res) => res.text())
    .then((result) => should(result).be.equal('last'));
  });

  it('should use `and` handler', function() {
    const server = createServer(Server.handler(
      and(
        async function(ctx, next) {
          await next();
        },
        async function(ctx, next) {
          await next();
        },
        async function({res}) {
          res.text('last');
        }
      )
    ));

    server.listen();

    after(function() {
      server.close();
    });

    return server.fetch('/')
    .then((res) => res.text())
    .then((result) => should(result).be.equal('last'));
  });

  it('should set cookies', function(){
    const server = createServer(Server.handler(
      async function({res}) {
        res.setCookie('one', 1);
        res.setCookie('two', 2);
        res.end();
      }
    ));

    server.listen();

    after(function() {
      server.close();
    });

    return server.fetch('/')
    .then(({status, headers}) => {
      // Check header
      should(status).be.equal(200);

      // Check set-cookie headers
      const cookies = headers.raw()['set-cookie'];
      should(cookies).be.deepEqual([
        'one=1; Path=/',
        'two=2; Path=/',
      ]);
    });
  });

  it('should output streams', function(){
    const server = createServer(Server.handler(
      async function({res}) {
        res.send(fs.createReadStream(__filename));
      }
    ));

    server.listen();

    after(function() {
      server.close();
    });

    return server.fetch('/')
    .then((res) => {
      should(res.status).be.equal(200);
      return res;
    })
    .then((res) => res.text())
    .then((body) => {
      should(body).be.equal(fs.readFileSync(__filename, 'utf8'));
    });
  });

  describe('Router', function(){
    it('should parse route params', function() {
      const router = new Router();

      router.get('/users/:id', async function({req, res}) {
        res.send(req.params.id);
      });

      const server = createServer(Server.handler(
        router,
      ));

      server.listen();

      after(function() {
        server.close();
      });

      return server.fetch('/users/1')
      .then((res) => res.text())
      .then((result) => should(result).be.equal('1'));
    });

    it('should define several method handlers with addRoute()', function() {
      const router = new Router();

      router.addRoute(['post', 'get'], '/users/', async function({req, res}) {
        res.send('1');
      });

      const server = createServer(Server.handler(
        router,
      ));

      server.listen();

      after(function() {
        server.close();
      });

      return server.fetch('/users/', {method: 'get'})
      .then((res) => res.text())
      .then((result) => should(result).be.equal('1'));
    });

    it('should use subrouter', function() {
      const router = new Router();

      router.route('/users/', Router.handler({
        'GET /:id': async function({req, res}) {
          res.send(req.params.id);
        },
      }));

      const server = createServer(Server.handler(
        router,
      ));

      server.listen();

      after(function() {
        server.close();
      });

      return server.fetch('/users/2')
      .then((res) => res.text())
      .then((result) => should(result).be.equal('2'));
    });

    it('should use nested subrouters', function() {
      const router1 = new Router();
      const router2 = new Router();
      const router3 = new Router();

      router3.get('/:id', async function({req, res}) {
        res.send(req.params.id);
      });

      router2.route('/users/', router3);
      router1.route('/api/', router2);

      const server = createServer(Server.handler(
        router1,
      ));

      server.listen();

      after(function() {
        server.close();
      });

      return server.fetch('/api/users/3')
      .then((res) => res.text())
      .then((result) => should(result).be.equal('3'));
    });
  });
});
