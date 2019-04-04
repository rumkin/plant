const http = require('http')
const Plant = require('..')

const plant = new Plant()

plant.use(async ({req, res}) => {
  // Set request input stream as response body
  res.body = req.body
})

http.createServer(plant.handler())
.listen(8080)
