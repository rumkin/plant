/**
* @module Plant.CommonHandleType
* @description Common Http Request and Response handlers.
*/

const {Readable} = require('stream');
const {URL} = require('url');
const isObject = require('lodash.isobject');

const Headers = require('../headers');
const Request = require('../request');
const Response = require('../response');
const Socket = require('../socket');

const {as} = require('../utils/types');

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
  const {remoteAddress} = req.connection;
  let ip = remoteAddress;
  let host = req.headers['host'];
  let encrypted = req.connection.encrypted;

  if (remoteAddress === '::ffff:127.0.0.1') {
    const xForwardedFor = req.headers['x-forwarded-for'];
    const xForwardedHost = req.headers['x-forwarded-host'];

    if (xForwardedFor) {
      ip = xForwardedFor;
    }

    if (xForwardedHost) {
      host = xForwardedHost;
    }

    encrypted = req.headers['x-forwarded-proto'] === '1';
  }

  return [host, ip, encrypted];
}

/**
 * Create Plant Request from native http.IncomingMessage
 *
 * @param  {http.IncomingMessage} req Native Http request
 * @return {Request} Returns `this`.
 */
function createRequest(req) {
  const [host, ip, encrypted] = getResolvedNetworkProps(req);
  const protocol = encrypted
    ? 'https'
    : 'http';

  const url = new URL(`${protocol}://${host}${req.url}`);
  const method = req.method.toLowerCase();

  const inReq = new Request({
    method,
    url,
    headers: new Headers(req.headers, Headers.MODE_IMMUTABLE),
    stream: as(req, Readable),
    sender: ip,
  });

  return inReq;
}

/**
 * Creates Plant.Socket instance from http socket object. Bind abort event
 * listener to mark socket closed.
 *
 * @param  {Writable} connection Writable socket stream.
 * @return {Socket} New socket instance.
 */
function createSocket(connection) {
  const socket = new Socket({
    onEnd() {
      if (! connection.ended) {
        connection.end();
      }
    },
  });

  let onEnd;
  let unbind;

  onEnd = () => {
    socket.end();
    unbind();
  };

  unbind = () => {
    connection.removeListener('abort', onEnd);
    connection.removeListener('end', onEnd);
  };

  connection.on('abort', onEnd);
  connection.on('end', onEnd);
  socket.on('destroy', unbind);

  return socket;
}

/**
 * Create Plant.Response instance from http.ServerResponse.
 *
 * @param  {http.ServerResponse} res Nodejs http ServerResponse instance.
 * @return {Response}     Plant.Response instance.
 */
function createResponse(res) {
  return new Response({
    status: res.statusCode,
    headers: new Headers(res.headers),
    body: null,
  });
}

/**
 * httpHandler - Shim between nodejs HTTP and Plant HTTP Interface
 *
 * @param  {HttpContex} context - Default HTTP context.
 * @param  {function} next Default Plant's next method
 * @return {void}
 * @async
 */
function httpHandler({req, res, ...ctx}, next) {
  const inReq = createRequest(req);
  const inRes = createResponse(res);
  const socket = createSocket(req.socket);

  req.socket.setMaxListeners(Infinity);

  return next({
    ...ctx,
    req: inReq,
    res: inRes,
    socket,
  })
  .then(() => {
    socket.destroy();

    if (inRes.body === null) {
      inRes.status(404).text('Nothing found');
    }

    res.statusCode = inRes.statusCode;

    for (const header of inRes.headers.keys()) {
      res.setHeader(header, inRes.headers.raw(header));
    }

    if (req.ended) {
      return;
    }

    const {body} = inRes;

    if (isObject(body)) {
      if (typeof body.pipe === 'function') {
        res.flushHeaders();
        body.pipe(res);
      }
      else {
        throw new TypeError('Invalid body type');
      }
    }
    else {
      res.end(body);
    }
  });
}

module.exports = httpHandler;
