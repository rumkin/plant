const fs = require('fs')
const {promisify} = require('util')
const {ReadableStream} = require('web-streams-polyfill/ponyfill')

module.exports = {
  exists: promisify(fs.exists),
  stat: promisify(fs.stat),
  lstat: promisify(fs.lstat),
  readDir: promisify(fs.readdir),
  readLink: promisify(fs.readlink),
  writeFile: promisify(fs.writeFile),
  readFile: promisify(fs.readFile),
  createReadStream(filepath, options) {
    let stream
    let isCanceled = false

    return new ReadableStream({
      // type: 'bytes',
      start(controller) {
        stream = fs.createReadStream(filepath, options)

        stream.on('data', (chunk) => {
          controller.enqueue(chunk)
        })
        stream.on('end', () => {
          if (isCanceled) {
            return
          }

          isCanceled = true
          controller.close()
        })
        stream.on('error', (error) => {
          if (isCanceled) {
            return
          }

          isCanceled = true
          controller.error(error)
        })
        stream.on('close', () => {
          if (isCanceled) {
            return
          }

          isCanceled = true
          controller.close()
        })
      },
      cancel() {
        if (isCanceled) {
          return
        }

        if (stream) {
          stream.destroy()
        }

        isCanceled = true
      },
    })
  },
}
