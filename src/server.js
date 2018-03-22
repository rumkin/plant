/**
 * @module Plant.Server
 * @description Implementation of Plant Server interface.
 */

const isPlainObject = require('lodash.isplainobject');
const isString = require('lodash.isstring');

const {and, or, getHandler} = require('./server-flow');
const {commonHandler, errorHandler} = require('./handlers.js');
const Router = require('./router');
const Response = require('./response');
const Request = require('./request');
const Headers = require('./headers');

/**
 * @function HandleFunc
 * @description Cascade handling function
 * @param {Object} context - Plant context object
 * @param {function(?Object)} next - Plant cascade server callback.
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
 * @typedef {Object} Handler - Cascade handler is an object with method handler
 * @prop {CreateHandleFunc} handler - Function that creates HandleFunc.
 */

/**
 * @typedef {HandleFunc|Handler} HandleType - Cascade request handle function or Object
 * which has method `handler`. Which returns such function
 */

/**
  * @typedef {Object} ServerOptions - Server configuration options.
  * @prop {Array.<HandleType>} [handlers=[]] - List of request handlers.
  * @prop {Object} [context={}] - Context object.
  * @prop {function(Error)} [onError] - Uncaught error handler.
  */

/**
 * @class
 * @classdesc Plant cascade server.
 */
class Server {
  /**
   * new - Static constructor.
   *
   * @param {*} args - Server constructor arguments.
   * @returns {Server} Server instance.
   * @static
   */
  static new(...args) {
    return new this(...args);
  }

  /**
   * create - Create new server instance
   *
   * @param  {ServerOptions} [options={}] Server options. Optional
   * @param  {...HandleType} args Request handler.
   * @return {Server} Return new server instance.
   * @static
   */
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

  /**
   * handler - Instantiate new Plant.Server and creates http handler from it.
   *
   * @param  {ServerOptions} [options] Server initial options.
   * @param  {...HandleType} [handlers] Server request handlers.
   * @return {function()} Http handler function.
   * @static
   */
  static handler(...args) {
    return this.create(...args)
    .handler();
  }

  /**
   * @constructor
   *
   * @param  {ServerOptions} options
   * @return {Server} Server instance.
   */
  constructor({handlers, context = {}, onError} = {}) {
    this.handlers = handlers
      ? [...handlers.map(getHandler)]
      : [errorHandler, commonHandler];

    this.context = Object.assign({}, context);
    this.onError = onError;
  }

  /**
   * use - Add cascade handlers.
   *
   * @param  {String} [route] Optional route prefix.
   * @param  {...HandleType} args Cascade handlers.
   * @return {Server} return `this`.
   */
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

  /**
   * Add parallel cascade handler.
   *
   * @param  {...HandleType} handlers Cascade request handlers list.
   * @return {Server} Returns `this`.
   */
  or(...handlers) {
    if (handlers.length) {
      this.use(or(...handlers));
    }
    return this;
  }

  /**
   * Add nested cascade handler.
   *
   * @param  {...HandleType} handlers Request handlers
   * @return {Server} Returns `this`.
   */
  and(...handlers) {
    if (handlers.length) {
      this.use(and(...handlers));
    }

    return this;
  }

  /**
   * Add request handling router.
   *
   * @param  {Object|Router} routes Request handling router.
   * @return {Server} Returns `this`.
   */
  router(routes) {
    return this.use(Router.handler(routes));
  }

  /**
   * Set uncaught error handler.
   *
   * @param  {function(Error)} handler Error handler
   * @returns {Server} Returns `this`.
   */
  errorHandler(handler) {
    this.onError = handler;
    return this;
  }

  /**
   * handler - Create native http request handler from Server
   *
   * @returns {function(http.IncomingMessage,http.ServerResponse)} Native http request handler function
   */
  handler() {
    const cascade = and(...this.handlers);
    const context = this.context;
    const onError = this.onError;

    return function(req, res) {
      cascade(Object.assign({}, context, {req, res}))
      .catch((error) => {
        // Write error to res.
        if (! res.headersSent) {
          res.statusCode = 500;
          res.write('Internal server error');
          res.end();
        }
        else if (onError) {
          res.end(); // End request
          onError(error);
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

module.exports = Server;

// Expose cascade server flow controls
Server.and = and;
Server.or = or;
Server.getHandler = getHandler;

// Expose core classes
Server.Router = Router;
Server.Request = Request;
Server.Response = Response;
Server.Headers = Headers;
