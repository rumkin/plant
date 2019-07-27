const Plant = require('@plant/plant')

const plant = new Plant()

const url = new URL('http://localhost:8080/')

// Create HTTP context's params
const req = new Plant.Request({
  url,
})
const res = new Plant.Response({
  url,
})

// Request peer. Peer represents other side of connection.
const peer = new Plant.Peer({
  uri: new Plant.URI({
    protocol: 'proc:',
    hostname: process.pid,
  }),
})

// Create connection socket
const socket = new Plant.Socket({
  peer,
  // If socket allows write upstream, then onPush method could be defined to handle pushes.
  // onPush should return Promise which resolves when response sending completes.
  // eslint-disable-next-line no-unused-vars
  async onPush(response) {
    // Send response with web socket
  },
})

const handleRequest = plant.getHandler()

handleRequest({req, res, socket})
.finally(() => socket.destroy())
