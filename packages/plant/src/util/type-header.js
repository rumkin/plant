/**
 * @module TypeHeaderUtils
 */

/**
 * @typedef TypeEntity
 * @prop {String} type Type entry value
 * @prop {Object} params Type params, like `q`, `charset`, etc.
 */

/**
 * parseHeader - Parse complete type header value for Content-Type and Accept
 * headers. Example:
 * `text/html;q=1.0, image/png;q=0.1`.
 *
 * @param  {string} header Request header.
 * @return {TypeEntity[]} Array of type objects.
 */
function parseHeader(header) {
  const entities = header.split(/\s*,\s*/)

  return entities.map(parseEntity)
}

/**
 * parseEntity - parse singe header type entry. Type entry is a string which
 * contains key value pairs separated with semicolon. Example:
 * `application/jsoncharset=utf8`.
 *
 * @param  {String} entity Type entry.
 * @return {TypeEntity} returns type entry object.
 */
function parseEntity(entity) {
  const [type, ...tail] = entity.split(/;/)

  const params = getParams(tail)

  if (params.q) {
    params.q = parseFloat(params.q)
  }

  return {type, params}
}

/**
 * getParams - convert list of key-value strings into object with proper keys
 * and values.
 *
 * @param  {String[]} params Array of key value strings.
 * @return {Object<String,String>} Object.
 * @access private
 */
function getParams(params) {
  return params.map(function (param) {
    return param.split('=')
  })
  .reduce(function (result, [name, value]) {
    return {
      ...result,
      [name]: value,
    }
  }, {})
}

exports.parseHeader = parseHeader
exports.parseEntity = parseEntity
