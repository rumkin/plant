/**
 * @module Plant.ServerFlow
 * @description Flow control utils for Plant Cascade Server
 */
const {cascade, doWhile} = require('./flow.js');

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
 * Determine that request is finished. Using to manage cascade depth.
 *
 * @param {NativeContext} options Native context.
 * @returns {Boolean} Return true if response has body or socket closed.
 */
function isNotFinished({res, socket}) {
  return res.hasBody === false && socket.isEnded === false;
}

/**
 * Create async request handlers queue. It iterate request handlers and if
 * request handler doesn't sent response it runs next request handler and so.
 *
 * @param  {...(function()|Handlable)} handlers Handlable async functions.
 * @return {function(object,function)} Returns function which pass context through the queue.
 */
const whileNotFinished = doWhile(isNotFinished);

/**
 * Returns function that runs handlers until request headers are not sent.
 *
 * @param  {...(function()|Handlable)} args - List of handlable values.
 * @returns {function(object, function())} Returns function to pass value into handlers.
 */
const or = function(...args) {
  return whileNotFinished(...args.map(getHandler));
};

/**
 * Returns function that runs handlers in depth.
 *
 * @param  {...(function()|Handlable)} args - List of handlable values.
 * @returns {function(object)} Returns function to pass value into handlers.
 */
const and = function(...args) {
  return cascade(...args.map(getHandler));
};

exports.or = or;
exports.and = and;
exports.getHandler = getHandler;
