const {isPlainObject, isString} = require('lodash');
const {and, or, getHandler} = require('./utils.js');
const Router = require('./router.js');

const {commonHandler, errorHandler} = require('./handlers.js');

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

  constructor({handlers, context = {}, onError} = {}) {
    this.handlers = handlers
      ? [...handlers.map(getHandler)]
      : [errorHandler, commonHandler];

    this.context = Object.assign({}, context);
    this.errorHandler = onError;
  }

  use(...args) {
    let handlers;

    if (isString(args[0])) {
      const route = args[0];

      handlers = [
        or(
          and(
            Router.getSubrouteMatcher(route),
            ...args.slice(1).map(getHandler),
          ),
        ),
      ];
    }
    else if (args.length > 1) {
      handlers = [or(
        and(
          ...args.map(getHandler)
        )
      )];
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

  and(...handlers) {
    return this.use(and(...handlers));
  }

  router(routes) {
    return this.use(Router.handler(routes));
  }

  errorHandler(handler) {
    this.errorHandler = handler;
  }

  handler() {
    const cascade = and(...this.handlers);
    const context = this.context;
    const errorHandler = this.errorHandler;

    return function(req, res) {
      cascade(Object.assign(context, {req, res}))
      .catch((error) => {
        // Write error to res.
        if (! res.headersSent) {
          res.statusCode = 500;
          res.write('Internal server error');
        }
        else if (errorHandler) {
          res.end(); // End request
          errorHandler(error);
        }
        else {
          res.end(); // End request
          console.error(error);
          throw error;
        }
      });
    };
  }
}

module.exports =  Server;

Server.Router = Router;
Server.and = and;
Server.or = or;
Server.getHandler = getHandler;
