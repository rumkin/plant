/**
 * Handlable object should countain method handler() which returns async
 * function. This function receive two params: context and next.
 * @type {Handlable}
 * @prop {function()} handler Return async function.
 */

/**
 * Get function from passed value.
 * @param  {function|Handlable} handler Handlable value.
 * @return {function(object,function)} Returns function.
 */
function getHandler(handler) {
  if (typeof handler !== 'function') {
    return handler.handler();
  }
  else {
    return handler;
  }
}

/**
 * Create async stack resolver.
 * @param  {...function()|Handlable} handlers Handlable async functions.
 * @return {function(object)} Returns function which pass context through the stack.
 */
function stack(...handlers) {
  const fn = async (initialCtx) => {
    let ctx = initialCtx;

    const next = (items) => async (newCtx) => {
      ctx = newCtx || ctx;

      if (items.length) {
        return await items[0](Object.assign({}, ctx), next(items.slice(1)));
      }
    };

    return next(handlers.map(getHandler))(ctx);
  };

  return fn;
}

/**
 * Create async queue resolver which works while condition returns false.
 * @param  {function(object)} contition Condition function which returns bool.
 * @return {function(...function()|Handlable)} Handlable async queue handler creator.
 */
function whileNot(contition) {
  return function(...args) {
    const handlers = args.map(getHandler);

    return async function(ctx, next) {
      for (const handler of handlers) {
        await handler(Object.assign({}, ctx), () => {});

        if (contition(ctx) === true) {
          return;
        }
      }

      await next();
    };
  };
}

/**
 * Create async request handlers queue. It iterate request handlers and if
 * request handler doesn't sent response it runs next request handler and so.
 * @param  {...function()|Handlable} handlers Handlable async functions.
 * @return {function(object,function)} Returns function which pass context through the queue.
 */
const or = whileNot(function({res}) {
  return res.headersSent;
});

exports.stack = stack;
exports.or = or;
exports.whileNot = whileNot;
exports.getHandler = getHandler;
