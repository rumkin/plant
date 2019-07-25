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
}

function isDisturbed(stream) {
  if (typeof stream._disturbed === 'boolean') {
    return stream._disturbed
  }
  else if (typeof Response !== 'undefined') {
    try {
      // eslint-disable-next-line no-undef
      const response = new Response(stream)
      // WebKit doesn't through
      return response.bodyUsed
    }
    catch (_) {
      return false
    }
  }
  else {
    throw new Error('Could not determine wether stream was disturbed')
  }
}

exports.isReadableStream = isReadableStream
exports.isDisturbed = isDisturbed
