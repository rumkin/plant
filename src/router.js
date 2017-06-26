const pathToRegexp = require('path-to-regexp');
const {isPlainObject, isString} = require('lodash');
const {or, stack, getHandler} = require('./flow.js');

class Router {
  static new(...args) {
    return new this(...args);
  }

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

  addRoute(method, route, ...handlers) {
    this.handlers.push({
      method: method && method.toLowerCase(),
      route,
      handlers: handlers.map(getHandler),
    });
    return this;
  }

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

  before(...handlers) {
    this.pre = [...this.pre, ...handlers.map(getHandler)];
  }

  route(route, ...handlers) {
    this.addRoute(null, route, ...handlers);
  }

  handler() {
    return or(...this.handlers.map(
      ({method, route, handlers}) => stack(
        method ? getRouteMatcher(method, route) : getSubrouteMatcher(route),
        ...this.pre,
        ...handlers,
      )
    ));
  }
}

[
  'all',
  'get',
  'post',
  'put',
  'patch',
  'delete',
].forEach((name) => {
  const method = name.toUpperCase();

  Router.prototype[name] = function(route, ...handlers) {
    return this.addRoute(method, route, ...handlers);
  };
});

function getRouteMatcher(method, route) {
  const matcher = createParamsMatcher(route);

  return async function(ctx, next){
    const {req} = ctx;

    if (req.method !== method && method !== 'ALL') {
      return;
    }

    const params = matcher(req.url);

    if (! params) {
      return;
    }

    const inReq = Object.create(req);

    inReq.params = params;

    await next(Object.assign({}, ctx, {req: inReq}));
  };
}

function getSubrouteMatcher(route) {
  const matcher = createParamsMatcher(route.replace(/\/*$/, '/*'));

  return async function(ctx, next){
    const {req} = ctx;

    const params = matcher(req.url);

    if (! params) {
      return;
    }

    const inReq = Object.create(req);

    inReq.params = params;

    inReq.url = '/' + params[0];
    inReq.baseUrl = (req.baseUrl || '') + req.url.slice(0, -params[0].length);

    await next(Object.assign({}, ctx, {req: inReq}));
  };
}

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
