const {cascade, whileNot} = require('./flow.js');

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
 * Create async request handlers queue. It iterate request handlers and if
 * request handler doesn't sent response it runs next request handler and so.
 * @param  {...function()|Handlable} handlers Handlable async functions.
 * @return {function(object,function)} Returns function which pass context through the queue.
 */
const whileNotHeadersSent = whileNot(function({res}) {
  return res.headersSent;
});

/**
 * Returns function that runs handlers until request headers are not sent.
 *
 * @param  {...function()|Handlable} args List of handlable values.
 * @return {function(object, funcition())} Returns function to pass value into handlers.
 */
const or = function(...args) {
  return whileNotHeadersSent(...args.map(getHandler));
};

/**
 * Returns function that runs handlers in depth.
 *
 * @param  {...function()|Handlable} args List of handlable values.
 * @return {function(object} Returns function to pass value into handlers.
 */
const and = function(...args) {
  return cascade(...args.map(getHandler));
};

exports.or = or;
exports.and = and;
exports.getHandler = getHandler;
