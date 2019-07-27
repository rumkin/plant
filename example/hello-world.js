const createServer = require('@plant/http')
const Plant = require('@plant/plant')

const plant = new Plant()

plant.use(async ({res}) => {
  // Send text response
  res.body = 'Hello, World!'
})

createServer(plant.handler())
.listen(8080)
