const {URL} = require('url');
const cookie = require('cookie');
const {Readable} = require('stream');
const typeIs = require('type-is');
const {isObject} = require('lodash');
const Headers = require('./headers');
const {readStream} = require('./utils');

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

    encrypted = req.headers['x-ssl'] === '1';
  }

  return [host, ip, encrypted];
}

class Request {
  constructor({ip, headers, url, method, origin}) {
    this.ip = ip;
    this.url = url;
    this.method = method;
    this.headers = headers;
    this.domains = /\.\d+$/.test(url.hostname)
      ? []
      : url.hostname.split('.').reverse();
    this.path = url.pathname.replace(/\/+/g, '/');
    this.basePath = '/';
    this.body = {};
    this.bodyStream = {
      receive() {
        return readStream(origin);
      },
    };
  }

  is(types) {
    return typeIs.is(this.headers.get('content-type'), types);
  }
}

function getRequestFrom(req) {
  const [host, ip, encrypted] = getResolvedNetworkProps(req);
  const protocol = encrypted
    ? 'https'
    : 'http';

  const urlString = `${protocol}://${host}${req.url}`;
  const url = new URL(urlString);
  const method = req.method.toLowerCase();

  const inReq = new Request({
    ip, // TODO Remove???
    method,
    url,
    headers: new Headers(req.headers, 'immutable'),
    origin: req,
  });

  return inReq;
}

class Response {
  constructor({status = 200, headers = null, body = null} = {}) {
    this.status = status;
    this.headers = headers || new Headers();
    this.body = body;
  }

  status(status) {
    this.statusCode = status;
    return this;
  };

  json(result) {
    this.body = JSON.stringify(result);
    this.headers.set('content-type', 'application/json');
    // this.headers.set('content-length', Byffer.byteLength(this.body));

    return this;
  };

  text(result, enc = 'utf8') {
    this.headers.set('content-type', 'text/plain');
    // this.headers.set('content-length', Buffer.byteLength(result, enc));
    this.body = result;

    return this;
  };

  html(result, enc = 'utf8') {
    this.headers.set('content-type', 'text/html');
    // this.headers.set('content-length', Buffer.byteLength(result, enc));
    this.body = result;

    return this;
  };

  sendStream(stream) {
    if (typeof stream.pipe !== 'function') {
      throw new TypeError('Not a Stream');
    }

    this.body = stream;

    return this;
  };

  send(result) {
    if (isObject(result) && (result instanceof Readable)) {
      this.sendStream(result);
    }
    else {
      this.body = String(result);
    }

    return this;
  };

  pipe(stream) {
    return res.pipe(stream);
  };

  end() {
    this.body = '';
  };
}

function getResponseFrom(res) {
  return new Response({
    status: res.statusCode,
    headers: new Headers(res.headers),
    body: null,
  });
}

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
 * @param  {http.InnerMessage} {req Nodejs native Request instance.
 * @param  {http.ResponseMessage} res} Nodejs native Response instance.
 * @param  {function} next Default Plant's next method
 */
async function commonHandler({req, res}, next) {
  const inReq = getRequestFrom(req);
  const inRes = getResponseFrom(res);

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

  if (! isObject(inRes.body)) {
    res.end(inRes.body);
  }
  else {
    res.flushHeaders();
    inRes.body.pipe(res);
  }
}

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
