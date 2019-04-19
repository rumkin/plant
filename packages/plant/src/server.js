/**
 * @module Plant.Server
 * @description Implementation of Plant Server interface.
 */

const {and, or, getHandler} = require('@plant/flow')
const isPlainObject = require('lodash.isplainobject')

const cookieHandler = require('./handlers/cookie-handler')

const Headers = require('./headers')
const Peer = require('./peer')
const Response = require('./response')
const Request = require('./request')
const Socket = require('./socket')
const URI = require('./uri')

/**
 * @typedef {Object} Plant.Context Default plant context with plant's instances for req and res.
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
  * @typedef {Object} ServerOptions Server configuration options.
  * @prop {Array.<HandleType>} [handlers=[]] List of request handlers.
  * @prop {Object} [context={}] Context object.
  */

/**
 * @class
 * @classdesc Plant cascade server.
 */
class Server {
  /**
   * Static constructor.
   *
   * @param {*} args Server constructor arguments.
   * @returns {Server} Server instance.
   * @static
   */
  static new(...args) {
    return new this(...args)
  }

  /**
   * Create new server instance
   *
   * @param  {ServerOptions} [options={}] Server options. Optional
   * @param  {...HandleType} args Request handler.
   * @return {Server} Return new server instance.
   * @static
   */
  static create(...args) {
    let options
    let handlers

    if (isPlainObject(args[0])) {
      options = args[0]
      handlers = args.slice(1)
    }
    else {
      options = {}
      handlers = args
    }

    return this.new(options)
    .use(...handlers)
  }

  /**
   * Instantiate new Plant.Server and creates http handler from it.
   *
   * @param  {ServerOptions} [options] Server initial options.
   * @param  {...HandleType} [handlers] Server request handlers.
   * @return {function()} Http handler function.
   * @static
   */
  static handler(...args) {
    return this.create(...args)
    .getHandler()
  }

  /**
   * @param  {ServerOptions} options Server options params.
   * @constructor
   */
  constructor({handlers = [], context = {}} = {}) {
    this.handlers = handlers.map(getHandler)

    this.context = Object.assign({}, context)
  }

  /**
   * Add cascade handlers.
   *
   * @param  {String} [route] Optional route prefix.
   * @param  {...HandleType} args Cascade handlers.
   * @return {Server} return `this`.
   */
  use(...args) {
    let handlers

    if (args.length > 1) {
      handlers = [or(and(...args))]
    }
    else {
      handlers = args.map(getHandler)
    }

    this.handlers = [...this.handlers, ...handlers]

    return this
  }

  /**
   * Add parallel cascade handler.
   *
   * @param  {...HandleType} handlers Cascade request handlers list.
   * @return {Server} Returns `this`.
   */
  or(...handlers) {
    if (handlers.length) {
      this.use(or(...handlers))
    }
    return this
  }

  /**
   * Add nested cascade handler.
   *
   * @param  {...HandleType} handlers Request handlers
   * @return {Server} Returns `this`.
   */
  and(...handlers) {
    if (handlers.length) {
      this.use(and(...handlers))
    }

    return this
  }

  /**
   * Create native http request handler from Server
   *
   * @returns {function(http.IncomingMessage,http.ServerResponse)} Native http request handler function
   */
  getHandler() {
    const initialCtx = {...this.context}
    const handler = and(
      async function (ctx, next) {
        if (! ctx.socket) {
          ctx.socket = new Socket()
        }

        ctx.subRequest = function(options) {
          let req
          if (options instanceof Request) {
            req = options
          }
          else if (options instanceof URL) {
            req = new Request({
              url: options,
              parent: ctx.req,
            })
          }
          else {
            req = new Request({
              ...options,
              parent: ctx.req,
            })
          }

          const res = new Response({
            url: req.url,
          })

          return {
            ctx: {},
            context(nextCtx) {
              this.ctx = nextCtx
              return this
            },
            send() {
              return handler({
                ...initialCtx,
                ...this.ctx,
                ...ctx,
                req,
                res,
              })
              .then(() => res)
            },
            push() {
              return this.send()
              .then((subRes) => ctx.socket.push(subRes))
            },
          }
        }
        await next({...initialCtx, ...ctx})
        return ctx
      },
      cookieHandler,
      ...this.handlers,
    )

    return handler
  }
}

module.exports = Server

// Expose core classes
Server.Headers = Headers
Server.Peer = Peer
Server.Request = Request
Server.Response = Response
Server.Socket = Socket
Server.URI = URI
