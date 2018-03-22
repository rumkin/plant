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

/**
 * @typedef {Object} NativeContext - Initial plant context with native instances for req and res.
 * @prop {http.IncomingMessage} req - Request instance.
 * @prop {http.ServerResponse} res - Response instance.
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
    sender: ip,
    method,
    url,
    headers: new Headers(req.headers, Headers.MODE_IMMUTABLE),
    origin: req,
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
 * addCookieSupport - add methods to set cookies and current cookie data object.
 *
 * @param  {http.IncomingMessage} req - Native HTTP Request instance
 * @param  {http.ServerResponse} res  - Native HTTP Response instance
 * @param  {Request} inReq - Plant.Request instance
 * @param  {Response} inRes - Plant.Response instance
 * @return {void}
 */
function addCookieSupport(req, res, inReq, inRes) {
  if (inReq.headers.hasOwnProperty('cookie')) {
    inReq.cookies = cookie.parse(inReq.headers.cookie);
  }
  else {
    inReq.cookies = {};
  }

  // Set new cookie value
  inRes.setCookie = inRes.cookie = function(cookieName, value, options) {
    const opts = Object.assign({path: '/'}, options);
    const headerValue = cookie.serialize(cookieName, String(value), opts);

    inRes.headers.append('set-cookie', headerValue);

    return this;
  };

  // Remove cookie by name
  inRes.clearCookie = function(cookieName, options) {
    const opts = Object.assign({expires: new Date(1), path: '/'}, options);
    const value = cookie.serialize(cookieName, '', opts);

    this.headers.append('set-cookie', value);

    return this;
  };

  // Remove all cookies
  inRes.clearCookies = function(options) {
    Object.getOwnPropertyNames(inReq.cookies)
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

  // Modify innner request and response object
  addCookieSupport(req, res, inReq, inRes);

  await next({req: inReq, res: inRes, socket: req.socket});

  if (inRes.body === null) {
    inRes.status(404).text('Nothing found');
  }

  res.statusCode = inRes.statusCode || 200;

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
exports.errorHandler = errorHandler;
