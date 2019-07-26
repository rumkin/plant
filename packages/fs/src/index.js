const vfs = require('vfs')
const customFs = require('./custom-fs')

function serveDir(...args) {
  return vfs.createDirHandler(customFs, ...args)
}

function serveFile(...args) {
  return vfs.createFileHandler(customFs, ...args)
}

exports.serveDir = serveDir
exports.serveFile = serveFile
