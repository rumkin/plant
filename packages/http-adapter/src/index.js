/**
 * @module Plant.HTTP
 * @description Implementation of Plant Server interface.
 */

const {and} = require('@plant/flow')
const {URL} = require('url')
const isObject = require('lodash.isobject')

const streams = require('./deps/web-streams-polyfill')

const {ReadableStream: WebReadableStream} = streams
const TypedArray = Object.getPrototypeOf(Uint8Array)

const INTERNAL_SERVER_ERROR_MSG = 'Internal server error'

/**
 * @typedef {Object} NativeContext Initial http context with native instances for req and res.
 * @prop {http.IncomingMessage} req Request instance.
 * @prop {http.ServerResponse} res Response instance.
 */

/**
 * Get host, port, remote ip and encryption from
 * forward http headers.
 *
 * @param  {http.IncomingMessage} req HTTP Request.
 * @returns {Array<String,String,Boolean>} Return hostname, ip and encyption status as Array.
 */
function getResolvedNetworkProps(req) {
  const {remoteAddress, remotePort} = req.connection
  let address = remoteAddress
  let port = remotePort
  let encrypted = req.connection.encrypted
  let host

  if (req.headers[':authority']) {
    host = req.headers[':authority']
  }
  else if (req.headers['host']) {
    host = req.headers['host']
  }

  if (remoteAddress === '::ffff:127.0.0.1') {
    const xForwardedFor = req.headers['x-forwarded-for']
    const xForwardedHost = req.headers['x-forwarded-host']

    if (xForwardedFor) {
      address = xForwardedFor
      port = '0' // forwarded port is unknown
    }

    if (xForwardedHost) {
      host = xForwardedHost
    }

    encrypted = req.headers['x-forwarded-proto'] === '1'
  }

  return [host, {address, port}, encrypted]
}

/**
 * Create Plant Request from native http.IncomingMessage
 *
 * @param {http.IncomingMessage} req Native Http request
 * @param {Object} data Request data.
 * @param {string} data.host Request hostname.
 * @param {bool} data.encrypted Request encryption flag.
 * @param {PlantLib} lib Plant objects constructors.
 * @return {Request} Returns `this`.
 */
function createRequest(req, {host, encrypted}, {Request, Headers}) {
  const protocol = encrypted
    ? 'https'
    : 'http'

  const url = new URL(`${protocol}://${host}${req.url}`)
  const method = req.method.toLowerCase()

  const inReq = new Request({
    method,
    url,
    headers: new Headers(req.headers, Headers.MODE_IMMUTABLE),
    body: new WebReadableStream({
      start(controller) {
        req.resume()
        req.on('data', (chunk) => {
          controller.enqueue(chunk)
        })
        req.on('end', () => {
          controller.close()
        })
      },
      cancel() {
        req.drain()
      },
    }),
  })

  return inReq
}

/**
 * writeResponseToWritableStream - Write Plant Response into Writeable stream.
 *
 * @param  {WriteableStream} stream WriteableStream instance.
 * @param  {Response} response Plant Response instance.
 * @return {Promise<void,Error>} Resolves when Response's stream writing is finished.
 */
async function writeResponseToWritableStream(stream, response) {
  const {body} = response

  try {
    if (isObject(body)) {
      if (typeof body.getReader === 'function') {
        await writeWebReadableStreamToWritableStream(stream, body)
      }
      else if (body instanceof Buffer || body instanceof String) {
        stream.write(body)
      }
      else if (body instanceof TypedArray) {
        writeUint8ArrayToNodeStream(stream, body)
      }
      else {
        throw new TypeError('Invalid body type')
      }
    }
    else if (typeof body === 'string') {
      stream.write(body)
    }
    else {
      throw new TypeError('Invalid body type')
    }
  }
  finally {
    stream.end()
  }
}

/**
 * writeWebReadableStream - Write Web ReadableStream into regular stream.
 *
 * @param  {WriteableStream} destination Writeable stream instance.
 * @param  {WebReadableStream} source WebReadaableStream instance.
 * @return {Promise<void,Error>} Return promise which resolves when stream writing ends.
 */
async function writeWebReadableStreamToWritableStream(destination, source) {
  let reader
  try {
    if (source.locked) {
      throw new Error('Source stream is locked')
    }

    reader = source.getReader()

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const {value, done} = await reader.read()

      // eslint-disable-next-line max-depth
      if (done) {
        break
      }

      if (typeof value === 'string' || value instanceof Buffer) {
        destination.write(value)
      }
      else {
        writeUint8ArrayToNodeStream(destination, value)
      }
    }
  }
  finally {
    if (reader !== void 0) {
      reader.cancel()
    }
    else {
      source.cancel()
    }
  }
}

// Convert Uint8Array into Buffer without reallocaation
function writeUint8ArrayToNodeStream(stream, value) {
  const {prototype} = value.constructor
  Object.setPrototypeOf(value, Buffer.prototype)
  try {
    stream.write(value)
  }
  finally {
    Object.setPrototypeOf(value, prototype)
  }
}

/**
 * Creates Plant.Socket instance from http socket object. Bind abort event
 * listener to mark socket closed.
 *
 * @param {Writable} connection Writable socket stream.
 * @param {Http2Stream} stream HTTP2 Stream of connection.
 * @param {object} remote Remote params.
 * @param {string} remote.address Remote end address.
 * @param {number} remote.port Remote end port.
 * @param {PlantLib} lib Plant objects constructors.
 * @return {Socket} New socket instance.
 */
function createSocket(connection, stream, remote, {Socket, Peer, URI}) {
  let onPush

  if (stream && stream.pushAllowed) {
    onPush = function(res) {
      return new Promise(function(resolve, reject) {
        const headers = {
          ':path': res.url.pathname + res.url.search,
        }

        res.headers.forEach((function(value, header) {
          headers[header] = value
        }))

        stream.pushStream(headers, function(err, pushStream) {
          if (err) {
            reject(err)
          }
          else {
            pushStream.respond({
              ':status': res.status,
            })
            writeResponseToWritableStream(pushStream, res)
            .then(resolve, reject)
          }
        })
      })
    }
  }
  else {
    onPush = null
  }
  const socket = new Socket({
    peer: new Peer({
      uri: new URI({
        protocol: 'tcp:',
        hostname: remote.address,
        post: remote.port,
      }),
    }),
    onEnd() {
      if (! connection.ended) {
        connection.end()
      }
    },
    onPush,
  })

  let onEnd
  let unbind

  onEnd = () => {
    socket.end()
    unbind()
  }

  unbind = () => {
    connection.removeListener('abort', onEnd)
    connection.removeListener('close', onEnd)
  }

  connection.on('abort', onEnd)
  connection.on('close', onEnd)
  socket.on('destroy', unbind)

  return socket
}

/**
 * Create Plant.Response instance from http.ServerResponse.
 *
 * @param {http.ServerResponse} res Nodejs http ServerResponse instance.
 * @param {Object} options Response options
 * @param {URL} options.url Response URL.
 * @param {PlantLib} lib Plant objects constructors.
 * @return {Response}     Plant.Response instance.
 */
function createResponse(res, {url}, {Response, Headers}) {
  return new Response({
    url,
    status: res.statusCode,
    headers: new Headers(res.headers),
    body: null,
  })
}

/**
 * httpHandler - Shim between nodejs HTTP and Plant HTTP Interface
 *
 * @param  {http.IncomingMessage} httpReq - Http client request
 * @param  {http.ServerResponse} httpRes - Http server response
 * @param  {PlantLib} lib - Plant constructors for Request, Response, Socket, etc.
 * @param  {function} next Default Plant's next method
 * @return {void}
 * @async
 */
function handleRequest(httpReq, httpRes, lib, next) {
  const [host, remote, encrypted] = getResolvedNetworkProps(httpReq)
  const req = createRequest(httpReq, {host, encrypted}, lib)
  const res = createResponse(httpRes, {url: req.url}, lib)
  const socket = createSocket(httpReq.socket, httpReq.stream, remote, lib)

  httpReq.socket.setMaxListeners(Infinity)

  return next({
    httpReq,
    httpRes,
    req,
    res,
    socket,
  })
  .then(async () => {
    if (httpReq.ended) {
      socket.destroy()
      return
    }

    if (res.body === null) {
      res.setStatus(404).text('Nothing found')
    }

    httpRes.statusCode = res.status

    for (const header of res.headers.keys()) {
      httpRes.setHeader(header, res.headers.raw(header))
    }

    return writeResponseToWritableStream(httpRes, res)
  })
}

/**
 * @typedef Context Default plant context with plant's instances for req and res.
 * @prop {Request} req Request instance.
 * @prop {Response} res Response instance.
 * @prop {Socket} socket Socket instance.
 */

/**
 * @function HandleFunc
 * @description Cascade handling function
 * @param {Object} context Plant context object
 * @param {function(?Object)} next Plant cascade server callback.
 * @async
 * @returns {Promise<void>} Handle func should modify it's arguments and produce
 */

/**
 * @function CreateHandleFunc
 * @description Function that creates cascade request function
 * @param {...HandleType} [handlers] Create handle function can receive HandleType params to produce new handle function.
 * @returns {HandleFunc}
 */

/**
 * Cascade handler is an object with method handler
 * @typedef {Object} Handler
 * @prop {CreateHandleFunc} handler - Function that creates HandleFunc.
 */

/**
  * Plant constructors object.
  * @typedef {Object} PlantLib
  * @prop {Headers} Headers - Headers constructor.
  * @prop {Peer} Peer - Peer constructor.
  * @prop {Request} Request - Request constructor.
  * @prop {Response} Response - Response constructor.
  * @prop {Socket} Socket - Socket constructor.
  * @prop {URI} URI - URI constructor.
  */

/**
 * @typedef {HandleFunc|Handler} HandleType Cascade request handle function or Object
 * which has method `handler`. Which returns such function
 */

/**
 * Create native http request handler from Plant  instance
 *
 * @param {Plant} plant - Plant server instance.
 * @param {Object} options - Handler creation options.
 * @param {Handler[]} options.handlers – Intermediate handlers.
 * @param {boolean} options.debug – Specify wether adapter is running in debug mode.
 * @returns {function(http.IncomingMessage,http.ServerResponse)} Native http request handler function.
 */
function createRequestHandler(plant, {handlers = [], debug = false} = {}) {
  const handler = and(
    ...handlers,
    contextWithout(['httpReq', 'httpRes']),
    plant,
  )

  const {Headers, Peer, Request, Response, Socket, URI} = plant.constructor

  return function (req, res) {
    handleRequest(req, res, {Headers, Socket, Peer, URI, Request, Response}, handler)
    .catch(handleRequestError.bind(this, req, res, debug))
  }
}

function handleRequestError(req, res, debug, error) {
  // Write error to res.
  if (! res.headersSent) {
    const message = debug
      ? `Error: ${error.message}`
      : INTERNAL_SERVER_ERROR_MSG

    res.statusCode = 500
    res.setHeader('content-type', 'text/plain')
    res.setHeader('content-length', message.length)
    res.write(message)
  }

  res.end()
  this.emit('error', error)
}

function contextWithout(keys) {
  return (ctx, next) => next(without(keys, ctx))
}

function without(keys, value) {
  const newValue = {...value}
  for (const key of keys) {
    delete newValue[key]
  }
  return newValue
}

exports.createRequestHandler = createRequestHandler
exports.INTERNAL_SERVER_ERROR_MSG = INTERNAL_SERVER_ERROR_MSG
