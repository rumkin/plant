const url = require('url');
const cookie = require('cookie');
const {Readable} = require('stream');
const {isObject, isPlainObject, isString} = require('lodash');
const {stack, or, getHandler} = require('./flow.js');
const Router = require('./router.js');

function createInnerRequest(req) {
  const inReq = Object.create(req);
  const parsedUrl = url.parse(req.url, {query: true});

  inReq.url = parsedUrl.pathname.replace(/\/+/g, '/');
  inReq.search = parsedUrl.search;
  inReq.query = parsedUrl.query;

  return inReq;
}

function createInnerResponse(res) {
  const inRes = Object.create(res);

  return inRes;
}

function setHeadersMethods(req, res, inReq, inRes) {
  inReq.headers = {
    get(name, alt) {
      return req.headers[name] || alt;
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

async function contextHandler({req, res}, next) {
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

class Server {
  static new(...args) {
    return new this(...args);
  }

  static create(...args) {
    let options;
    let handlers;

    if (isPlainObject(args[0])) {
      options = args[0];
      handlers = args.slice(1);
    }
    else {
      options = {};
      handlers = args;
    }

    return this.new(options)
    .use(...handlers);
  }

  static handler(...args) {
    return this.create(...args)
    .handler();
  }

  constructor({handlers, context = {}} = {}) {
    this.handlers = handlers
      ? [...handlers.map(getHandler)]
      : [errorHandler, contextHandler];

    this.context = Object.assign({}, context);
  }

  use(...args) {
    let handlers;

    if (isString(args[0])) {
      const route = args[0];

      handlers = [
        or(
          stack(
            Router.getSubrouteMatcher(route),
            ...args.slice(1).map(getHandler),
          ),
        ),
      ];
    }
    else {
      handlers = args.map(getHandler);
    }

    this.handlers = [...this.handlers, ...handlers];
    return this;
  }

  or(...handlers) {
    return this.use(or(...handlers));
  }

  stack(...handlers) {
    return this.use(stack(...handlers));
  }

  router(routes) {
    return this.use(Router.handler(routes));
  }

  handler() {
    const stacked = stack(...this.handlers);
    const context = this.context;

    return function(req, res) {
      stacked(Object.assign(context, {req, res}))
      .catch((error) => {
        // Write error to res.
        if (! res.headersSent) {
          res.statusCode = 500;
          res.write('Internal server error');
        }
        else {
          console.error(error);
        }
      });
    };
  }
}

module.exports =  Server;
Server.Router = Router;
Server.stack = stack;
Server.or = or;
