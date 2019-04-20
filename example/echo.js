const createServer = require('@plant/http')
const Plant = require('@plant/plant')

const plant = new Plant()

plant.use(async ({req, res}) => {
  // Set request input stream as response body
  res.body = req.body
})

createServer(plant.handler())
.listen(8080)
