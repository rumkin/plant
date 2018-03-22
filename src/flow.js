/**
 * @module Plant.Flow
 * @description Methods to control cascade flows.
 */

/**
 * Create async cascade resolver.
 * @param {...HandleType} args Handlable async functions.
 * @returns {function(Context)} Returns function which pass context through the stack.
 */
function cascade(...args) {
  const resolver = async (initialCtx) => {
    let ctx = initialCtx;

    const next = (handlers) => async (newCtx) => {
      ctx = newCtx || ctx;

      if (handlers.length) {
        return await handlers[0](Object.assign({}, ctx), next(handlers.slice(1)));
      }
    };

    return next(args)(ctx);
  };

  return resolver;
}

/**
 * Creates async queue resolver which works while condition returns false.
 *
 * @param  {function(Context)} condition - Condition function which returns bool.
 * @returns {function(...HandleType)} Handlable async queue handler creator.
 */
function whileNot(condition) {
  return function(...handlers) {
    return async function(ctx, next) {
      for (const handler of handlers) {
        await handler(Object.assign({}, ctx), () => {});

        if (condition(ctx) === true) {
          return;
        }
      }

      await next();
    };
  };
}

exports.cascade = cascade;
exports.whileNot = whileNot;
