const isObject = require('lodash.isobject')
/**
 * isReadableStream - specify weather passed `value` has readable stream object
 * methods on, pipe and end.
 *
 * @param  {*} value Value to check.
 * @return {Boolean} Return true if value is readable stream.
 */
function isReadableStream(value) {
  return isObject(value)
  && typeof value.getReader === 'function'
  && typeof value.cancel === 'function'
  && typeof value.tee === 'function'
  && typeof value.pipeTo === 'function'
  && typeof value.pipeThrough === 'function'
}

exports.isReadableStream = isReadableStream
