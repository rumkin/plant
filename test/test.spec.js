const should = require('should');
const Pill = require('..');
const {stack, or, Router} = Pill;
const {createServer, readStream} = require('./utils.js');

describe('async stack', function() {
  it ('should iterate over chain', function() {
    let round = 0;

    const fn = stack(
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

describe('pill', function() {
  it('should server requests', function() {
    const server = createServer(Pill.handler(
      async function({req, res}) {
        should(req.headers.contentType).be.equal('text/plain');
        res.send('OK');
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
    .then((result) => should(result).be.equal('OK'));
  });

  it('should read body', function() {
    const server = createServer(Pill.handler(
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
    const server = createServer(Pill.handler(
      async function({res}) {
        res.headers.contentType.set('application/json');
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
    const server = createServer(Pill.handler(
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

  it('should use stack handler', function() {
    const server = createServer(Pill.handler(
      stack(
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

  describe('Router', function(){
    it('Should parse route params', function() {
      const router = new Router();

      router.get('/users/:id', async function({req, res}) {
        res.send(req.params.id);
      });

      const server = createServer(Pill.handler(
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

    it('Should use subrouter', function() {
      const router = new Router();

      router.route('/users/', Router.handler({
        'GET /:id': async function({req, res}) {
          res.send(req.params.id);
        },
      }));

      const server = createServer(Pill.handler(
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
  });
});
