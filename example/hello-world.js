const http = require('http')
const Plant = require('..')

const plant = new Plant()

plant.use(async ({res}) => {
  // Send text response
  res.body = 'Hello, World!';
})

http.createServer(plant.handler())
.listen(8080)
