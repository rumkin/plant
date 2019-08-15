/**
 * @module Plant.Server
 * @description Implementation of Plant Server interface.
 */

const {and, or, getHandler} = require('@plant/flow')
const isPlainObject = require('lodash.isplainobject')
const escapeRegexp = require('escape-string-regexp')

const cookieHandler = require('./handlers/cookie-handler')

const Headers = require('./headers')
const Peer = require('./peer')
const Response = require('./response')
const Request = require('./request')
const Route = require('./route')
const Socket = require('./socket')
const URI = require('./uri')

const CSP = Object.freeze({
  // Local resources only
  LOCAL: (protocol, hostname, port) => {
    let origin
    if (port) {
      origin = `localhost:${port}`
    }
    else {
      origin = 'localhost'
    }

    return [
      `default-src ${origin} 'unsafe-eval' 'unsafe-inline'`,
      `form-action ${origin}`,
    ].join('; ')
  },
  // Allow current origin only
  DEV: [
    "default-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "form-action 'self'",
  ].join('; '),
  // Allow HTTP protocol
  TEST: [
    "default-src 'none'",
    "connect-src 'self'",
    "font-src 'self'",
    "img-src 'self'",
    "manifest-src 'self'",
    "media-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "worker-src 'self'",
    "form-action 'self'",
    'require-sri-for script style',
    'block-all-mixed-content',
  ].join('; '),
  // Allow only self HTTPS
  STRICT: (protocol, hostname) => {
    return [
      "default-src 'none'",
      `connect-src https://${hostname}`,
      `font-src https://${hostname}`,
      `img-src https://${hostname}`,
      `manifest-src https://${hostname}`,
      `media-src https://${hostname}`,
      `script-src https://${hostname}`,
      `style-src https://${hostname}`,
      `worker-src https://${hostname}`,
      `form-action https://${hostname}`,
      'require-sri-for script style',
      'block-all-mixed-content',
    ].join('; ')
  },
})

/**
 * @typedef {Object} Plant.Context Default plant context with plant's instances for req and res.
 * @prop {fetch} fetch Server fetch method.
 * @prop {Request} req Request instance.
 * @prop {Response} res Response instance.
 * @prop {Route} route ROute instance.
 * @prop {Socket} socket Socket instance.
 */

/**
 * @function fetch
 * @description Fetch internal resource.
 * @param {URL|Request} Subrequest url or Request object.
 * @async
 * @returns {Promise<Response,Error>} Resolved with Response instance Promise.
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
class Plant {
  /**
   * Static constructor.
   *
   * @param {*} args Server constructor arguments.
   * @returns {Plant} Server instance.
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
   * @return {Plant} Return new server instance.
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
      options = void 0
      handlers = args
    }

    return this.new(options)
    .use(...handlers)
  }

  static route(url) {
    return getRouteMatcher(url)
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
  constructor({handlers = [], context = {}, csp = CSP.LOCAL} = {}) {
    this.handlers = handlers.map(getHandler)

    this.context = Object.assign({}, context)
    this.csp = csp
  }

  /**
   * Add cascade handlers.
   *
   * @param  {String} [route] Optional route prefix.
   * @param  {...HandleType} args Cascade handlers.
   * @return {Plant} return `this`.
   */
  use(...args) {
    let handlers

    if (args.length > 1) {
      if (typeof args[0] === 'string') {
        args[0] = getRouteMatcher(args[0])
      }
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
   * @return {Plant} Returns `this`.
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
   * @return {Plant} Returns `this`.
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
    let csp
    if (typeof this.csp === 'function') {
      csp = this.csp
    }
    else if (typeof this.csp === 'string') {
      const _csp = this.csp
      csp = () => _csp
    }
    else {
      csp = null
    }

    const handler = and(
      async function (ctx, next) {
        // TODO Decide to remove this
        if (! ctx.socket) {
          ctx.socket = new Socket({
            peer: new Peer({
              uri: new URI({}),
            }),
          })
        }

        // If server mounted as handler of another server then route should
        // not be recreated.
        if (! ctx.route) {
          ctx.route = new Route({
            path: ctx.req.url.pathname,
          })
        }

        ctx.fetch = createFetch(handler, {
          ...initialCtx,
          ...ctx,
        })

        await next({...initialCtx, ...ctx})

        const {req, res, socket, fetch} = ctx
        if (socket.canPush && res.hasPushes) {
          await Promise.all(res.pushes.map(push => {
            if (push.response !== null) {
              return socket.push(push.response)
            }
            else {
              return fetch(push.request, push.context)
              .then(response => socket.push(response))
            }
          }))
        }

        if (csp !== null && requiresCsp(res)) {
          const {protocol, hostname, port, pathname} = req.url
          res.headers.set('content-security-policy', csp(protocol, hostname, port, pathname))
        }

        return ctx
      },
      cookieHandler,
      ...this.handlers,
    )

    return handler
  }
}

function requiresCsp(res) {
  if (res.headers.has('content-security-policy')) {
    return false
  }
  else if (
    ! res.headers.has('content-type')
    || ! res.headers.get('content-type').trimStart().startsWith('text/html')
  ) {
    return false
  }
  else {
    return true
  }
}

function createFetch(handler, ctx) {
  function fetch(options, nextCtx) {
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
    else if (typeof options === 'string') {
      req = new Request({
        url: new URL(options, ctx.req.url),
      })
    }
    else {
      let url = options.url
      if (typeof url === 'string') {
        url = new URL(url, ctx.req.url)
      }

      req = new Request({
        ...options,
        url,
        parent: ctx.req,
      })
    }

    const res = new Response({
      url: req.url,
    })

    const childCtx = {
      ...ctx,
      ...nextCtx,
      req,
      res,
      route: Route.fromRequest(req),
    }

    return handler({
      ...childCtx,
      fetch: createFetch(handler, childCtx),
    })
    .then(() => res)
  }

  return fetch
}

function getRouteMatcher(routePath) {
  if (/\/\*$/.test(routePath)) {
    const _routePath = routePath.replace(/\/+\*$/, '')
    const re = new RegExp(`^${escapeRegexp(_routePath)}(\\/|\\/?$)`)

    return matchRouteHandler.bind(null, re)
  }
  else {
    const _routePath = routePath.replace(/\/+$/, '')
    const re = new RegExp(`^${escapeRegexp(_routePath)}\\/?$`)

    return matchRouteHandler.bind(null, re)
  }
}

function matchRouteHandler(re, {route, ...ctx}, next) {
  const match = route.path.match(re)
  if (! match) {
    return
  }

  const subRoute = route.clone().capture(match[0])

  return next({
    ...ctx,
    route: subRoute,
  })
}

module.exports = Plant

// Expose core classes
Plant.Headers = Headers
Plant.Peer = Peer
Plant.Request = Request
Plant.Response = Response
Plant.Route = Route
Plant.Socket = Socket
Plant.URI = URI
Plant.CSP = CSP
Plant.createFetch = createFetch
