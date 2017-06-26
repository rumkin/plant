const url = require('url');
const cookie = require('cookie');
const {isPlainObject, isString, camelCase, kebabCase} = require('lodash');
const {stack, or, getHandler} = require('./flow.js');
const Router = require('./router.js');

async function contextHandler({req, res}, next) {
  const parsedUrl = url.parse(req.url, {query: true});

  // Create inner request
  const inReq = Object.create(req);

  inReq.url = parsedUrl.pathname.replace(/\/+/g, '/');
  inReq.search = parsedUrl.search;
  inReq.query = parsedUrl.query;
  inReq.headers = {};

  Object.keys(req.headers)
  .forEach((key) => {
    inReq.headers[camelCase(key)] = req.headers[key];
  });

  if (inReq.headers.hasOwnProperty('cookie')) {
    inReq.cookies = cookie.parse(inReq.headers.cookie);
  }
  else {
    inReq.cookies = {};
  }

  // Create inner response
  const inRes = Object.create(res);
  const headers = {};

  inRes.headers = new Proxy(headers, {
    get(self, name) {
      if (name === 'values') {
        return Object.assign({}, self);
      }
      else if (name === 'valueOf' || name === 'toJSON') {
        return () => {
          headers.valueOf();
        };
      }

      let value;
      const key = kebabCase(name);

      if (key in self) {
        value = self[key];
      }
      else {
        const set = function(newValue) {
          if (Array.isArray(newValue)) {
            self[key] = toList(newValue);
          }
          else {
            self[key] = toString(newValue);
          }
        };

        const push = function(...values) {
          self[key] = toList(values);
        };

        const remove = function() {
          delete self[key];
        };

        const toList = function(list) {
          list.set = set;
          list.remove = remove;

          return list;
        };

        const toString = function(newValue) {
          const string = new String(newValue);

          string.set = set;
          string.push = push;
          string.remove = remove;

          return string;
        };

        value = toString('');
      }

      return value;
    },
    has(self, key) {
      return Reflect.has(self, kebabCase(key));
    },
    ownKeys(self) {
      return Reflect.ownKeys(self);
    },
  });

  inRes.setHeaders = function() {
    for (const header of Object.getOwnPropertyNames(headers)) {
      res.setHeader(header, headers[header]);
    }
  };

  inRes.sendHeaders = function() {
    if (! this.headersSent) {
      this.setHeaders();
      res.writeHead(this.statusCode);
    }
  };

  inRes.status = function(status) {
    res.statusCode = status;
    return this;
  };

  inRes.json = function(result) {
    this.headers.contentType.set('application/json');
    this.send(JSON.stringify(result));
    return this;
  };

  inRes.text = function(result) {
    this.headers.contentType.set('text/plain');
    this.send(result);
    return this;
  };

  inRes.html = function(result) {
    this.headers.contentType.set('text/html');
    this.send(result);
    return this;
  };

  inRes.send = function(result) {
    this.sendHeaders();
    res.end(result);
    return this;
  };

  inRes.end = function(...args) {
    this.sendHeaders();
    return res.end(...args);
  };

  inRes.pipe = function(stream) {
    this.sendHeaders();
    return res.pipe(stream);
  };

  inRes.setCookie = inRes.cookie = function(name, value, options) {
    const opts = Object.assign({path: '/'}, options);

    this.headers.setCookie.push(
      cookie.serialize(name, String(value), opts)
    );
    return this;
  };

  inReq.clearCookie = function(name, options) {
    const opts = Object.assign({expires: new Date(1), path: '/'}, options);

    this.headers.setCookie.push(
      cookie.serialize(name, '', opts)
    );

    return this;
  };

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

  static handler(...args) {
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
    .use(...handlers)
    .handler();
  }

  constructor({handlers = [], context = {}} = {}) {
    this.handlers = [errorHandler, contextHandler, ...handlers.map(getHandler)];
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
Server.errorHandler = errorHandler;
Server.contextHandler = contextHandler;
