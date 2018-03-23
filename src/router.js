/**
* @module Plant.Router
* @description Plant Server router
*/

const pathToRegexp = require('path-to-regexp');
const isPlainObject = require('lodash.isplainobject');
const isString = require('lodash.isstring');

const {or, and, getHandler} = require('./server-flow.js');

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
    return new this(...args);
  }

  /**
   * Instantiates Router and call handler method.
   *
   * @param  {RouterOptions} routes Router config or factory.
   * @return {Router} Instantiated Router.
   * @static
   */
  static handler(routes) {
    const router = this.new();

    if (isPlainObject(routes)) {
      Object.getOwnPropertyNames(routes)
      .forEach((key) => {
        const [method, route] = key.split(' ');
        let handlers = routes[key];

        if (! Array.isArray(handlers)) {
          handlers = [handlers];
        }
        router.addRoute(method, route, ...handlers);
      });
    }
    else {
      routes(router);
    }

    return router.handler();
  }

  constructor() {
    this.pre = [];
    this.handlers = [];
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
    if (_method) {
      let methods;
      if (Array.isArray(_method)) {
        methods = _method;
      }
      else {
        methods = _method.split(/\s+/);
      }

      for (const method of methods) {
        this.handlers.push({
          method: method.toLowerCase(),
          route,
          handlers: handlers.map(getHandler),
        });
      }
    }
    else {
      this.handlers.push({
        method: null,
        route,
        handlers: handlers.map(getHandler),
      });
    }
    return this;
  }

  /**
   * Adds regular handler without url matcher.
   *
   * @param  {...String|HandleType} [args] Route prefix and list of handlers.
   * @return {Router} Returns `this`.
   */
  use(...args) {
    let route;
    let handlers;

    if (isString(args[0])) {
      route = args[0];
      handlers = args.slice(1);
    }
    else {
      route = '/*';
      handlers = args;
    }

    this.addRoute('all', route, ...handlers);
    return this;
  }

  /**
   * Add handler to start of execution cascade.
   *
   * @param  {...HandleType} handlers Cascade handlers.
   * @return {Router} Returns `this`.
   */
  before(...handlers) {
    this.pre = [...this.pre, ...handlers.map(getHandler)];
  }

  /**
   * Add subrouter.
   *
   * @param {String} route Route URL or pattern.
   * @param {...HandleType} handlers Subroute handlers.
   * @returns {void} No return value.
   */
  route(route, ...handlers) {
    this.addRoute(null, route, ...handlers);
  }

  /**
   * Create cascade handler from router methods.
   *
   * @return {HandleFunc} Returns HandleFunc implementation.
   */
  handler() {
    return or(...this.handlers.map(
      ({method, route, handlers}) => and(
        method ? getRouteMatcher(method, route) : getSubrouteMatcher(route),
        ...this.pre,
        ...handlers,
      )
    ));
  }

  /**
   * @name Router#all
   * @function
   * @memberof Router
   * @description Add method to match and HTTP method
   * @param {String} url Route URL or pattern.
   * @param {...HandleType} handlers Request handelers.
   * @returns {Router}
   */
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
  'all',
  'head',
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
].forEach((name) => {
  const method = name.toUpperCase();

  Router.prototype[name] = function(route, ...handlers) {
    return this.addRoute(method, route, ...handlers);
  };
});

/**
 * Creates route matcher. Wraps request object.
 *
 * @param  {String} method Http method name.
 * @param  {String} route  Route URL or pattern.
 * @return {HandleFunc} Route handler.
 */
function getRouteMatcher(method, route) {
  const matcher = createParamsMatcher(route);

  return async function(ctx, next){
    const {req} = ctx;

    if (req.method !== method && method !== 'all') {
      return;
    }

    const params = matcher(req.path);

    if (! params) {
      return;
    }

    const inReq = Object.create(req);
    inReq.params = Object.assign({}, req.params, params);

    await next(Object.assign({}, ctx, {req: inReq}));
  };
}

/**
 * Get subrouter matcher. Wraps request object.
 *
 * @param  {String} route Route URL or pattern.
 * @return {HandleFunc} Request handler with url matching.
 */
function getSubrouteMatcher(route) {
  const matcher = createParamsMatcher(route.replace(/\/*$/, '/*'));

  return async function(ctx, next){
    const {req} = ctx;
    const url = req.path;

    const params = matcher(url);

    if (! params) {
      return;
    }

    const inReq = Object.create(req);
    inReq.params = Object.assign({}, req.params, params);

    inReq.path = '/' + params[0];
    inReq.basePath = req.basePath + url.slice(0, -params[0].length);

    await next(Object.assign({}, ctx, {req: inReq}));
  };
}

/**
 * Creates url matcher from pattern.
 *
 * @param  {String} route Pattern
 * @return {function(String)} Route matcher function.
 */
function createParamsMatcher(route) {
  const keys = [];
  const re = pathToRegexp(route, keys);

  return function(url) {
    const matches = re.exec(url);

    if (! matches) {
      return null;
    }

    const params = {};

    matches.slice(1)
    .forEach((match, i) => {
      params[keys[i].name] = match;
    });

    return params;
  };
}

module.exports = Router;
Router.getRouteMatcher = getRouteMatcher;
Router.getSubrouteMatcher = getSubrouteMatcher;
