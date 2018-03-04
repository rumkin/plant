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
const whileBodyIsNull = whileNot(function({res}) {
  return res.body !== null;
});

/**
 * Returns function that runs handlers until request headers are not sent.
 *
 * @param  {...function()|Handlable} args List of handlable values.
 * @return {function(object, funcition())} Returns function to pass value into handlers.
 */
const or = function(...args) {
  return whileBodyIsNull(...args.map(getHandler));
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


/**
 * readStream - Read text stream in promise. Note that stream size should not
 * be greater than available memory.
 *
 * @param  {Stream.Readable} stream Data stream.
 * @return {Buffer}                 Concatenated stream data.
 */
function readStream(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    stream.on('data', (chunk) => {
      chunks.push(chunk);
    });

    stream.on('end', () => {
      resolve(Buffer.concat(chunks).toString());
    });

    stream.on('error', reject);
  });
}

exports.or = or;
exports.and = and;
exports.getHandler = getHandler;
exports.readStream = readStream;
