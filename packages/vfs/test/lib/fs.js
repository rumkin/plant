const {Volume} = require('memfs')
const pify = require('pify')

const {NodeToWebStream} = require('@plant/node-stream-utils')

function createFs() {
  const fs = new Volume()

  return {
    exists: pify((...args) => fs.exists(...args)),
    stat: pify((...args) => fs.stat(...args)),
    lstat: pify((...args) => fs.lstat(...args)),
    mkdir: pify((...args) => fs.mkdir(...args)),
    readDir: pify((...args) => fs.readDir(...args)),
    readLink: pify((...args) => fs.readLink(...args)),
    writeFile: pify((...args) => fs.writeFile(...args)),
    readFile: pify((...args) => fs.readFile(...args)),
    createReadStream: (...args) => {
      return new NodeToWebStream(fs.createReadStream(...args))
    },
  }
}

async function readStream(stream, encoding) {
  const chunks = []
  const reader = stream.getReader()

  for await (const chunk of reader) {
    chunks.push(chunk)
  }

  const buffer = Buffer.concat(chunks)

  if (encoding !== void 0) {
    return buffer.toString(encoding)
  }
  else {
    return buffer
  }
}

exports.createFs = createFs
exports.readStream = readStream
