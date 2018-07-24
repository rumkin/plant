const http = require('http');
const Plant = require('..');

const plant = new Plant();

plant.use(async ({req, res}) => {
  // Send text response
  res.body = req.stream;
});

http.createServer(plant.handler())
.listen(8080);
