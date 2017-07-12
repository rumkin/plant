const url = require('url');
const cookie = require('cookie');
const {Readable} = require('stream');
const typeIs = require('type-is');
const {isObject} = require('lodash');

function overwriteProxyHeaders(req, inReq) {
  const {remoteAddress} = req.connection;

  if (remoteAddress === '::ffff:127.0.0.1') {
    const xForwardedFor = req.headers['x-forwarded-for'];
    const xForwardedHost = req.headers['x-forwarded-host'];

    if (xForwardedFor) {
      inReq.ip = xForwardedFor;
    }
    else {
      inReq.ip = remoteAddress;
    }

    if (xForwardedHost) {
      inReq.host = xForwardedHost;
    }
    else {
      inReq.host = req.headers['host'];
    }
  }
}

function createInnerRequest(req) {
  const inReq = Object.create(req);
  const protocol = req.connection.encrypted
    ? 'https'
    : 'http';

  overwriteProxyHeaders(req, inReq);

  const parsedUrl = url.parse(`${protocol}://${inReq.host}${req.url}`, {query: true});

  const host = parsedUrl.hostname;

  inReq.protocol = protocol;
  inReq.host = host;
  inReq.domains = /\.\d+$/.test(host)
    ? []
    : parsedUrl.hostname.split('.').reverse();
  inReq.port = parseInt(parsedUrl.port || '80');

  inReq.url = parsedUrl.pathname.replace(/\/+/g, '/');
  inReq.search = parsedUrl.search;
  inReq.query = parsedUrl.query;

  inReq.method = req.method.toLowerCase();
  inReq.is = function(types) {
    return typeIs.is(req.headers['content-type'], types);
  };
  inReq.body = {};

  return inReq;
}

function createInnerResponse(res) {
  const inRes = Object.create(res);

  return inRes;
}

function setHeadersMethods(req, res, inReq, inRes) {
  inReq.headers = {
    get(...args) {
      if (args.length) {
        return req.headers[args[0]] || args[1];
      }
      else {
        return Object.assign({}, req.headers);
      }
    },
    has(name) {
      return req.headers.hasOwnProperty(name);
    },
    names() {
      return Object.getOwnPropertyNames(req.headers);
    },
    entries() {
      return Object.entries(req.headers);
    },
  };

  inRes.headers = {
    set(...args) {
      if (args.length === 0) {
        for (const [header, value] of Object.entries(args[0])) {
          res.setHeader(header, value);
        }
      }
      else {
        res.setHeader(...args);
      }
    },
    remove(name) {
      res.removeHeader(name);
    },
    get(...args) {
      if (args.length) {
        return res.getHeader(args[0]) || args[1];
      }
      else {
        return res.getHeaders();
      }
    },
    has(name) {
      return res.hasHeader(name);
    },
    names() {
      return res.getHeaderNames();
    },
    entries() {
      return Object.entries(req.getHeaders());
    },
  };
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

    inRes.headers.set(
      'set-cookie', [...(inRes.headers.get('set-cookie') || []), headerValue]
    );

    return this;
  };

  // Remove cookie by name
  inRes.clearCookie = function(cookieName, options) {
    const opts = Object.assign({expires: new Date(1), path: '/'}, options);
    const value = cookie.serialize(cookieName, '', opts);

    this.headers.setCookie.push(value);

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

function setOutputMethods(req, res, inReq, inRes) {
  inRes.status = function(status) {
    res.statusCode = status;
    return this;
  };

  inRes.json = function(result) {
    this.headers.set('content-type', 'application/json');
    this.send(JSON.stringify(result));
    return this;
  };

  inRes.text = function(result) {
    this.headers.set('content-type', 'text/plain');
    this.send(result);
    return this;
  };

  inRes.html = function(result) {
    this.headers.set('content-type', 'text/html');
    this.send(result);

    return this;
  };

  inRes.sendStream = function(stream) {
    res.flushHeaders();
    stream.pipe(res);
  };

  inRes.send = function(result) {
    if (isObject(result) && (result instanceof Readable)) {
      this.sendStream(result);
    }
    else {
      res.end(result);
    }
    return this;
  };

  inRes.pipe = function(stream) {
    return res.pipe(stream);
  };

  inRes.end = function(...args) {
    return res.end(...args);
  };
}

async function commonHandler({req, res}, next) {
  const inReq = createInnerRequest(req);
  const inRes = createInnerResponse(res);

  // Modify innner request and response object
  setHeadersMethods(req, res, inReq, inRes);
  setOutputMethods(req, res, inReq, inRes);
  addCookieSupport(req, res, inReq, inRes);

  await next({req: inReq, res: inRes});
}

async function errorHandler({req, res}, next) {
  try {
    await next({req, res});
  }
  catch (error) {
    if (typeof error === 'number' && error < 600) {
      res.statusCode = error;
      res.end();
    }
    else {
      res.statusCode = 500;
      res.setHeader('content-type', 'text/plain');
      res.end(`Internal server error:\n${error.stack}`);
    }
  }

  if (! res.headersSent) {
    res.statusCode = 404;
    res.end('Nothing found');
  }
}

exports.commonHandler = commonHandler;
exports.errorHandler = errorHandler;
