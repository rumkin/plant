/**
 * @module Plant.Flow
 * @description Methods to control cascade flows.
 */

function noop() {}

/**
 * Create async cascade resolver.
 * @param {...HandleType} args Handlable async functions.
 * @returns {function(Context)} Returns function which pass context through the stack.
 */
function cascade(...args) {
  async function passThrough(initialCtx) {
    let ctx = initialCtx

    function next(handlers, newCtx) {
      ctx = newCtx || ctx

      if (handlers.length) {
        return handlers[0](Object.assign({}, ctx), next.bind(null, handlers.slice(1)))
      }
    }

    return await next(args, initialCtx)
  }

  return passThrough
}

/**
 * Creates async queue resolver which works while condition returns false.
 *
 * @param  {function(Context)} condition - Condition function which returns bool.
 * @returns {function(...HandleType)} Handlable async queue handler creator.
 */
function whileLoop(condition) {
  return function(...handlers) {
    return conditional.bind(null, handlers, condition)
  }
}

async function conditional(handlers, condition, ctx, next) {
  for (const handler of handlers) {
    await handler(Object.assign({}, ctx), noop)

    if (condition(ctx) === false) {
      return
    }
  }

  await next()
}

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
  if (typeof handler === 'object') {
    return handler.getHandler()
  }
  else {
    return handler
  }
}

/**
 * Determine that request is finished. Using to manage cascade depth.
 *
 * @param {NativeContext} options Native context.
 * @returns {Boolean} Return true if response has body or socket closed.
 */
function isNotFinished({res, socket}) {
  return res.hasBody === false && socket.isEnded === false
}

/**
 * Create async request handlers queue. It iterate request handlers and if
 * request handler doesn't sent response it runs next request handler and so.
 *
 * @param  {...(function()|Handlable)} handlers Handlable async functions.
 * @return {function(object,function)} Returns function which pass context through the queue.
 */
const whileNotFinished = whileLoop(isNotFinished)

/**
 * Returns function that runs handlers until request headers are not sent.
 *
 * @param  {...(function()|Handlable)} args - List of handlable values.
 * @returns {function(object, function())} Returns function to pass value into handlers.
 */
const or = function(...args) {
  return whileNotFinished(...args.map(getHandler))
}

/**
 * Returns function that runs handlers in depth.
 *
 * @param  {...(function()|Handlable)} args - List of handlable values.
 * @returns {function(object)} Returns function to pass value into handlers.
 */
const and = function(...args) {
  return cascade(...args.map(getHandler))
}

exports.cascade = cascade
exports.whileLoop = whileLoop
exports.or = or
exports.and = and
exports.getHandler = getHandler
