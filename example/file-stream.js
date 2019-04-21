const fs = require('fs')
const createServer = require('@plant/http')
const Plant = require('@plant/plant')
const WebStream = require('web-streams-polyfill/ponyfill')

const plant = new Plant()

plant.use(async ({res}) => {
  // Create native Node stream
  const stream = fs.createReadStream('./streams.js')
  // Wrap Node stream into WebAPI stream
  const webStream = wrapNodeStream(stream)
  // Send stream with response
  res.stream(webStream);
})

createServer(plant.handler())
.listen(8080)

// Stream wrapper
function wrapNodeStream(stream) {
  return new ReadableStream({
    start(controller) {
      stream.resume()
      stream.on('data', (chunk) => {
        controller.enqueue(chunk)
      })
      stream.on('end', () => {
        controller.close()
      })
    },
    cancel() {
      stream.close()
    },
  })
}
