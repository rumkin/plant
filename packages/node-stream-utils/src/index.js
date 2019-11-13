const {Readable} = require('stream')

class NodeToWebStream {
  constructor(stream) {
    this.stream = stream
    this._disturbed = false

    stream.pause()
  }

  getReader() {
    return new StreamReader(this.stream)
  }
}

class StreamReader {
  constructor(stream) {
    this.stream = stream
  }

  [Symbol.asyncIterator]() {
    return {
      next: this.read.bind(this),
    }
  }

  read() {
    const {stream} = this
    stream._disturbed = true

    return new Promise((resolve, reject) => {
      stream.resume()
      stream[Symbol.asyncIterator]()
      .next()
      .then(resolve, reject)
    })
  }

  releaseLock() {
    this.stream = null
  }
}

async function * iterateReader(reader) {
  for (const value of reader) {
    yield value
  }
}

class WebToNodeStream extends Readable {
  constructor(stream, options) {
    super(options)

    this._iterator = iterateReader(stream.getReader())
    this._disturbed = false
  }

  _read() {
    if (! this._reading) {
      this._next()
    }
  }

  async _next() {
    this._reading = true
    try {
      const {value, done} = await this._iterator.next()
      if (done) {
        this.push(null)
      }
      else if (this.push(await value)) {
        this._next()
      }
      else {
        this._reading = false
      }
    }
    catch (err) {
      this.destroy(err)
    }
  }
}

exports.NodeToWebStream = NodeToWebStream
exports.WebToNodeStream = WebToNodeStream
