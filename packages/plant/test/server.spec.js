const should = require('should');

const Plant = require('..');
const {and, or, Request, Response} = Plant;

// function readStream(stream) {
//   return new Promise((resolve, reject) => {
//     const chunks = [];
//     stream.on('data', (chunk) => chunks.push(chunk));
//     stream.on('error', reject);
//     stream.on('end', () => resolve(Buffer.concat(chunks)));
//   });
// }

async function errorTrap(ctx, next) {
  try {
    await next();
  }
  catch (err) {
    console.error(err);
    throw err;
  }
}

// TODO Rewrite tests.

describe('Plant()', function() {
  it('Should serve requests', function() {
    const handler = Plant.handler(
      errorTrap,
      async function({req, res}) {
        res.headers.set('content-type', req.headers.get('accept'));
        res.body = req.url.pathname;
      }
    );

    const req = new Request({
      url: '/index.html',
      method: 'GET',
      headers: {
        'accept': 'text/plain',
      },
    });

    const res = new Response();

    return handler({req, res})
    .then(() => {
      should(res.headers.get('content-type')).be.equal('text/plain');
      should(res.body).be.equal('/index.html');
    });
  });
});