/**
* @module Plant.Router
* @description Plant Server router
*/

const {and, or, getHandler} = require('@plant/flow')

const pathToRegexp = require('path-to-regexp')
const isString = require('lodash.isstring')

/**
 * @class
 * @classdesc Express-like Router implementation.
 */
class Router {
  /**
   * Static Router constructor.
   *
   * @param  {...*} args Router constructor arguments.
   * @return {Router} Instantiated Router.
   * @static
   */
  static new(...args) {
    return new this(...args)
  }

  /**
   * Instantiates Router and call handler method.
   *
   * @param  {RouterOptions} routes Router config or factory.
   * @return {Router} Instantiated Router.
   * @static
   */
  static create(routes) {
    const router = this.new()

    routes(router)

    return router
  }

  constructor() {
    this.pre = []
    this.handlers = []
  }

  /**
   * Adds new route to Router match queue. If `method` is null then add handler
   * for any method type.
   *
   * @param  {String} _method Method name: `get`, `post`, 'delete', etc.
   * @param  {String} route Route url or pattern.
   * @param  {...HandleType} handlers Route handlers.
   * @return {Router} Returns `this`.
   */
  addRoute(_method, route, ...handlers) {
    let methods
    if (Array.isArray(_method)) {
      methods = _method
    }
    else {
      methods = _method.split(/\s+/)
    }

    for (const method of methods) {
      this.handlers.push({
        method: method.toUpperCase(),
        route,
        handlers: handlers.map(getHandler),
      })
    }

    return this
  }

  /**
   * Adds regular handler without url matcher.
   *
   * @param  {...String|HandleType} [args] Route prefix and list of handlers.
   * @return {Router} Returns `this`.
   */
  use(...args) {
    let route
    let handlers

    if (isString(args[0])) {
      route = args[0]
      handlers = args.slice(1)
    }
    else {
      route = '/*'
      handlers = args
    }

    this.addRoute('all', route, ...handlers)
    return this
  }

  /**
   * Add handler to start of execution cascade.
   *
   * @param  {...HandleType} handlers Cascade handlers.
   * @return {Router} Returns `this`.
   */
  before(...handlers) {
    this.pre = [...this.pre, ...handlers.map(getHandler)]
  }

  /**
   * Create cascade handler from router methods.
   *
   * @return {HandleFunc} Returns HandleFunc implementation.
   */
  getHandler() {
    return or(...this.handlers.map(
      ({route, handlers}) => and(
        getRouteMatcher(route),
        ...this.pre,
        ...handlers,
      )
    ))
  }

  /**
   * @name Router#get
   * @function
   * @memberof Router
   * @description Add `get` method handler
   * @param {String} url Route URL or pattern.
   * @param {...HandleType} handlers Request handelers.
   * @returns {Router}
   */
  /**
   * @name Router#head
   * @function
   * @memberof Router
   * @description Add `head` method handler
   * @param {String} url Route URL or pattern.
   * @param {...HandleType} handlers Request handelers.
   * @returns {Router}
   */
  /**
   * @name Router#post
   * @function
   * @memberof Router
   * @description Add `post` method handler
   * @param {String} url Route URL or pattern.
   * @param {...HandleType} handlers Request handelers.
   * @returns {Router}
   */
  /**
   * @name Router#put
   * @function
   * @memberof Router
   * @description Add `put` method handler
   * @param {String} url Route URL or pattern.
   * @param {...HandleType} handlers Request handelers.
   * @returns {Router}
   */
  /**
   * @name Router#patch
   * @function
   * @memberof Router
   * @description Add `patch` method handler
   * @param {String} url Route URL or pattern.
   * @param {...HandleType} handlers Request handelers.
   * @returns {Router}
   */
  /**
   * @name Router#delete
   * @function
   * @memberof Router
   * @description Add `delete` method handler
   * @param {String} url Route URL or pattern.
   * @param {...HandleType} handlers Request handelers.
   * @returns {Router}
   */
  /**
   * @name Router#options
   * @function
   * @memberof Router
   * @description Add `options` method handler
   * @param {String} url Route URL or pattern.
   * @param {...HandleType} handlers Request handelers.
   * @returns {Router}
   */
}

[
  'head',
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
].forEach((name) => {
  const method = name.toUpperCase()

  Router.prototype[name] = function(route, ...handlers) {
    return this.addRoute(method, route, ...handlers)
  }
})

/**
 * Get subrouter matcher. Wraps request object.
 *
 * @param  {String} routePath Route URL or pattern.
 * @return {HandleFunc} Request handler with url matching.
 */
function getRouteMatcher(routePath) {
  const matcher = createParamsMatcher(routePath)

  return async function(ctx, next){
    const {route} = ctx

    if (! route) {
      return
    }

    const {path} = route
    const {params, matches} = matcher(path + '/')

    if (! matches.length) {
      return
    }

    const tail = '0' in params
      ? params['0']
      : ''

    delete params['0']

    const subRoute = route.clone()
    .capture(path.slice(0, path.length-tail.length), params)

    await next(
      {
        ...ctx,
        route: subRoute,
      },
    )
  }
}

/**
 * Creates url matcher from pattern.
 *
 * @param  {String} route Pattern
 * @return {function(String)} Route matcher function.
 */
function createParamsMatcher(route) {
  const keys = []
  const re = pathToRegexp(route, keys)

  return function(url) {
    const matches = re.exec(url)

    if (! matches) {
      return {params:{}, matches:[]}
    }

    const params = {}

    matches.slice(1)
    .forEach((match, i) => {
      params[keys[i].name] = match
    })

    return {params, matches}
  }
}

module.exports = Router
Router.getRouteMatcher = getRouteMatcher
