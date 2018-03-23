/**
* @module Plant.CommonHandleType
* @description Common Http Request and Response handlers.
*/

const {URL} = require('url');
const cookie = require('cookie');
const isObject = require('lodash.isobject');

const Headers = require('./headers');
const Request = require('./request');
const Response = require('./response');

const {as} = require('./utils/types');
const {Readable} = require('stream');

/**
 * @typedef {Object} NativeContext - Initial http context with native instances for req and res.
 * @prop {http.IncomingMessage} req - Request instance.
 * @prop {http.ServerResponse} res - Response instance.
 */

/**
 * @typedef {Object} PlantContext - Default plant context with plant's instances for req and res.
 * @prop {Request} req - Request instance.
 * @prop {Response} res - Response instance.
 * @prop {Object} socket - Request socket.
 */

/**
 * getResolvedNetworkProps - Get host, port, remote ip and encryption from
 * forward http headers.
 *
 * @param  {http.IncomingMessage} req - HTTP Request.
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
 * createRequest - Create Plant Request from native http.IncomingMessage
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
 * createResponse - Create Plant.Response instance from http.ServerResponse.
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
 * Adds methods to set cookies and current cookie data object.
 *
 * @param  {Request} req - Plant.Request instance
 * @param  {Response} res - Plant.Response instance
 * @return {void}
 */
function addCookieSupport(req, res) {
  if (req.headers.hasOwnProperty('cookie')) {
    req.cookies = cookie.parse(req.headers.cookie);
  }
  else {
    req.cookies = {};
  }

  // Set new cookie value
  res.setCookie = res.cookie = function(cookieName, value, options) {
    const opts = Object.assign({path: '/'}, options);
    const headerValue = cookie.serialize(cookieName, String(value), opts);

    res.headers.append('set-cookie', headerValue);

    return this;
  };

  // Remove cookie by name
  res.clearCookie = function(cookieName, options) {
    const opts = Object.assign({expires: new Date(1), path: '/'}, options);
    const value = cookie.serialize(cookieName, '', opts);

    this.headers.append('set-cookie', value);

    return this;
  };

  // Remove all cookies
  res.clearCookies = function(options) {
    Object.getOwnPropertyNames(req.cookies)
    .forEach((cookieName) => {
      this.clearCookie(cookieName, options);
    });
  };
}

/**
 * commonHandler - Shim between nodejs HTTP and Plant HTTP Interface
 *
 * @param  {HttpContex} context - Default HTTP context.
 * @param  {function} next Default Plant's next method
 * @return {void}
 * @async
 */
async function commonHandler({req, res}, next) {
  const inReq = createRequest(req);
  const inRes = createResponse(res);

  await next({req: inReq, res: inRes, socket: req.socket});

  if (inRes.body === null) {
    inRes.status(404).text('Nothing found');
  }

  res.statusCode = inRes.statusCode;

  inRes.headers.forEach((values, name) => {
    res.setHeader(name, values);
  });

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
}

/**
 * Add cookie controlls to request and response objects.
 *
 * @param  {PlantContext} context Plant Context.
 * @param  {function([Object])} next Next cascade handler emitter,
 * @returns {void} Returns nothing.
 */
function cookieHandler({req, res}, next) {
  addCookieSupport(req, res);
  return next();
}

/**
 * errorHandler - Handle errorc from underlaying handlers. Should be top handler
 * to return errors to client.
 *
 * @param  {NativeContext} context - Plant handler context object.
 * @param  {Function} next - Next handler emitter.
 * @return {void}
 * @async
 */
async function errorHandler({req, res}, next) {
  try {
    await next();
  }
  catch (error) {
    console.error(error);

    if (! req.headersSent) {
      if (typeof error === 'number' && error < 600) {
        res.statusCode = error;
        res.end();
      }
      else {
        res.statusCode = 500;
        res.send(`Internal server error:\n${error.stack || error}`);
      }
    }
    else {
      throw error;
    }
  }
}

exports.commonHandler = commonHandler;
exports.cookieHandler = cookieHandler;
exports.errorHandler = errorHandler;
