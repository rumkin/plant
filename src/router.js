const path = require('path');
const pathToRegexp = require('path-to-regexp');
const {isPlainObject, isString} = require('lodash');
const {or, and, getHandler} = require('./utils.js');

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
      ({method, route, handlers}) => and(
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
  'head',
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
