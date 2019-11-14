const electron = require('electron')
const {createRequestHandler} = require('@plant/electron-adapter')

const {protocol} = electron

function createServer(plant, {
  session = electron.session,
} = {}) {
  return new ElectronServer({
    plant,
    session,
  })
}

class ElectronServer {
  constructor({plant, session}) {
    this.plant = plant
    this.session = session
  }

  getHandler() {
    const handle = createRequestHandler(
      this.plant, this.session
    )

    return (request, callback) => {
      handle(request)
      .then(callback)
    }
  }

  interceptProtocol(name) {
    protocol.interceptStreamProtocol(
      name, this.getHandler()
    )
    return this
  }

  registerProtocol(name) {
    protocol.registerStreamProtocol(
      name, this.getHandler()
    )

    return this
  }
}

module.exports = createServer
