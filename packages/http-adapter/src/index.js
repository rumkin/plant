/**
 * @module Plant.HTTP
 * @description Implementation of Plant Server interface.
 */

const {and} = require('@plant/flow')
const {
  Peer,
  Response,
  Request,
  Headers,
  Socket,
  URI,
} = require('@plant/plant')
const streams = require('web-streams-polyfill/ponyfill')
const {URL} = require('url')
const isObject = require('lodash.isobject')

const {ReadableStream} = streams

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
 * @param  {http.IncomingMessage} req Native Http request
 * @return {Request} Returns `this`.
 */
function createRequest(req, {host, encrypted}) {
  const protocol = encrypted
    ? 'https'
    : 'http'

  const url = new URL(`${protocol}://${host}${req.url}`)
  const method = req.method.toLowerCase()

  const inReq = new Request({
    method,
    url,
    headers: new Headers(req.headers, Headers.MODE_IMMUTABLE),
    body: new ReadableStream({
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

async function writeResponseIntoStream(stream, response) {
  const {body} = response

  if (isObject(body)) {
    if (typeof body.getReader === 'function') {
      if (body.locked) {
        throw new Error('Body is locked')
      }

      const reader = body.getReader()
      while (true) {
        const {value, done} = await reader.read()
        // eslint-disable-next-line max-depth
        if (done) {
          break
        }
        stream.write(value)
      }
      stream.end()
    }
    else {
      throw new TypeError('Invalid body type')
    }
  }
  else {
    stream.end(body)
  }
}

/**
 * Creates Plant.Socket instance from http socket object. Bind abort event
 * listener to mark socket closed.
 *
 * @param  {Writable} connection Writable socket stream.
 * @param  {Http2Stream} stream HTTP2 Stream of connection.
 * @return {Socket} New socket instance.
 */
function createSocket(connection, stream) {
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
            writeResponseIntoStream(pushStream, res)
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
 * @param  {http.ServerResponse} res Nodejs http ServerResponse instance.
 * @return {Response}     Plant.Response instance.
 */
function createResponse(res, {url}) {
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
 * @param  {function} next Default Plant's next method
 * @return {void}
 * @async
 */
function handleRequest(httpReq, httpRes, next) {
  const [host, remote, encrypted] = getResolvedNetworkProps(httpReq)
  const req = createRequest(httpReq, {host, encrypted})
  const res = createResponse(httpRes, {url: req.url})
  const socket = createSocket(httpReq.socket, httpReq.stream)
  const peer = new Peer({
    uri: new URI({
      protocol: 'tcp:',
      hostname: remote.address,
      post: remote.port,
    }),
  })

  httpReq.socket.setMaxListeners(Infinity)

  return next({
    httpReq,
    httpRes,
    req,
    res,
    peer,
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

    writeResponseIntoStream(httpRes, res)
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
 * @typedef {Object} Handler Cascade handler is an object with method handler
 * @prop {CreateHandleFunc} handler Function that creates HandleFunc.
 */

/**
 * @typedef {HandleFunc|Handler} HandleType Cascade request handle function or Object
 * which has method `handler`. Which returns such function
 */

/**
 * Create native http request handler from Plant  instance
 *
 * @param {Plant} plant - Plant server instance.
 * @param {Handler[]} handlers – Intermediate handlers
 * @returns {function(http.IncomingMessage,http.ServerResponse)} Native http request handler function
 */
function createRequestHandler(plant, handlers = []) {
  const filtrateContext = without(['httpReq', 'httpRes'])
  const handler = and(
    ...handlers,
    (ctx, next) => next(filtrateContext(ctx)),
    plant,
  )

  return function (req, res) {
    handleRequest(req, res, handler)
    .catch(handleRequestError.bind(this, req, res))
  }
}

function handleRequestError(req, res, error) {
  // Write error to res.
  if (! res.headersSent) {
    res.statusCode = 500
    const message = 'Internal server error:\n' + error.message
    res.setHeader('content-type', 'text/plain')
    res.setHeader('content-length', message.length)
    res.write(message)
  }
  else {
    this.emit('error', error)
  }

  res.end()
}

function without(keys) {
  return function(value) {
    const newValue = {...value}
    for (const key of keys) {
      delete newValue[key]
    }
    return newValue
  }
}

module.exports = createRequestHandler
