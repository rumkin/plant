const electron = require('electron')

const {createRequestHandler} = require('@plant/electron-adapter')

function createServer(plant, {
  session = electron.session,
} = {}) {
  return new ElectronServer({
    handler: plant.getHandler(),
    session,
  })
}

class ElectronServer {
  constructor({handler, session}) {
    this.handler = handler
    this.session = session
  }

  interceptProtocol(name) {
    electron.protocol.interceptStreamProtocol(
      name, createRequestHandler(
        this.handler, this.session
      )
    )
    return this
  }

  registerProtocol(name) {
    electron.protocol.registerStreamProtocol(
      name, createRequestHandler(
        this.handler, this.session
      )
    )
    return this
  }
}

module.exports = createServer
