const http = require('http');
const Plant = require('@plant/plant');
const createHttp = require('@plant/http');

const plant = new Plant();

plant.use(async ({res}) => {
  // Send text response
  res.body = 'Hello, World!';
});

http.createServer(createHttp(plant))
.listen(8080);
