const fs = require('fs')
const {Readable, PassThrough} = require('stream')

const Plant = require('@plant/plant')
const {WebToNodeStream, NodeToWebStream} = require('@plant/node-stream-utils')

const {Request, Response, Socket, Peer, URI} = Plant

function withCallback(promise, callback) {
  if (callback) {
    return promise.then(callback)
  }
  else {
    return promise
  }
}

function createRequestHandler(plant, session) {
  const handle = plant.getHandler()

  return function(request, callback) {
    return withCallback(
      handleRequest(handle, session, request),
      callback,
    )
  }
}

async function handleRequest(handle, session, request) {
  const req = new Request({
    method: request.method,
    url: new URL(request.url),
    body: createBodyFromUploadData(session, request.uploadData),
  })
  const res = new Response({
    url: new URL(request.url),
  })

  await handle({
    req,
    res,
    socket: new Socket({
      peer: new Peer({
        uri: new URI({
          protocol: 'electron',
          hostname: process.pid,
        }),
      }),
    }),
  })

  let data
  if (res.hasBody === false) {
    throw new Error('Response is empty')
  }

  if (typeof res.body === 'string') {
    const stream = new PassThrough()

    stream.pause()
    stream.write(res.body)
    stream.end()

    data = stream
  }
  // Wrapped Stream
  else if (res.body.stream) {
    data = res.body.stream
  }
  else {
    data = new WebToNodeStream(res.body)
  }

  const headers = {}
  for (const name of res.headers.keys()) {
    const value = res.headers.raw(name)
    if (value.length === 1) {
      headers[name] = value[0]
    }
    else {
      headers[name] = value
    }
  }

  return {
    statusCode: res.status,
    headers,
    data,
  }
}

function createBodyFromUploadData(session, uploadData = []) {
  if (! uploadData.length) {
    return null
  }

  const items = [...uploadData]

  const generator = async function * () {
    while (items.length) {
      const item = items.shift()

      if (item.bytes) {
        yield item.bytes
      }
      else if (item.blobUUID) {
        yield await session.getBlobData(item.blobUUID)
      }
      else {
        const file = fs.createReadStream(item.file)
        for await (const chunk of file) {
          yield chunk
        }
      }
    }
  }

  const stream = Readable.from(generator())
  stream.pause()

  return new NodeToWebStream(stream)
}

exports.createRequestHandler = createRequestHandler
