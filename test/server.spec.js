const should = require('should');
const fs = require('fs');

const {createServer, readStream} = require('./utils');

const Server = require('..');
const {and, or} = Server;

describe('Plant.Flow', function() {
  describe('Cascade', function() {
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
});

describe('Server()', function() {
  it('Should serve HTTP requests', function() {
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

  it('Should update to proxy values', function() {
    const server = createServer(Server.handler(
      async function({req, res}) {
        res.json({
          sender: req.sender,
          host: req.url.hostname,
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
      should(result).has.ownProperty('sender').which.equal('127.0.0.2');
    });
  });

  it('Should determine request mime-type', function() {
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

  it('Should parse url data and hosts', function() {
    const plant = new Server();

    plant.use(async function({req, res}) {
      const {url} = req;

      res.json({
        method: req.method,
        protocol: url.protocol,
        host: url.hostname,
        port: url.port,
        domains: req.domains,
        url: req.path,
        query: {
          json: req.url.searchParams.get('json'),
        },
      });
    });

    const server = createServer(plant.handler());

    server.listen();

    after(function() {
      server.close();
    });

    return server.fetch('/request?json=1', {
      headers: {
        'X-Forwarded-Host': 'some.custom.host.test',
      },
    })
    .then((res) => res.json())
    .then((result) => should(result).be.deepEqual({
      method: 'get',
      protocol: 'http:',
      host: 'some.custom.host.test',
      port: '',
      domains: ['test', 'host', 'custom', 'some'],
      url: '/request',
      query: {
        json: '1',
      },
    }));
  });

  it('Should read body', function() {
    const server = createServer(Server.handler(
      async function({req}, next) {
        if (req.method !== 'GET') {
          req.body = await readStream(req.stream);
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

  it('Should send response headers', function() {
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

  it('Should use or handler', function() {
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

  it('Should use `and` handler', function() {
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

  it('Should make turns with use(h1, h2)', function() {
    const plant = Server.new();

    plant.use(
      async function({req}, next) {
        if (req.path === '/turn') {
          return await next();
        }
      },
      async function({res}) {
        res.text('turn');
      }
    )
    .use(async function({res}) {
      res.text('last');
    });

    const server = createServer(plant.handler());

    server.listen();

    after(function() {
      server.close();
    });

    return server.fetch('/')
    .then((res) => res.text())
    .then((result) => should(result).be.equal('last'));
  });

  it('Should visit turn defined with use(h1, h2)', function() {
    const plant = Server.new()
    .use(
      async function({req}, next) {
        if (req.path === '/turn') {
          return await next();
        }
      },
      async function({res}) {
        res.text('turn');
      }
    )
    .use(
      async function({res}) {
        res.text('last');
      }
    );

    const server = createServer(plant.handler());

    server.listen();

    after(function() {
      server.close();
    });

    return server.fetch('/turn')
    .then((res) => res.text())
    .then((result) => should(result).be.equal('turn'));
  });

  it('Should set cookies', function(){
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

  it('Should output streams', function(){
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
});
