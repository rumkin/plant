const fs = require('fs')
const path = require('path')

const createServer = require('@plant/http')
const Plant = require('@plant/plant')

const PORT = process.env.PORT || 8080

const plant = new Plant()

// Send stream response
plant.use(async function({req, res}) {
  res.body = fs.createReadStream(
    path.resolve('/', req.url.pathname)
  )
})

createServer(plant.handler())
.listen(PORT)
