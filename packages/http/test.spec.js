const net = require('net');

const should = require('should');
const fetch = require('node-fetch');
const Plant = require('@plant/plant');

const createServer = require('.');

describe('@plant/http', function() {
  it('Should server be instance of net.Server', function() {
    const plant = new Plant();
    const server = createServer(plant);

    should(server).be.instanceOf(net.Server);
  });

  it('Should handle http requests', async function() {
    const plant = new Plant();
    plant.use(({res}) => {
      res.body = 'Hello';
    });

    const server = createServer(plant);
    after(function() {
      server.close();
    });

    server.listen(0);

    const res = await fetch(`http://127.0.0.1:${server.address().port}`);
    const body = await res.text();

    should(body).be.equal('Hello');
  });
});
