/* global TextDecoder */
/**
 * @module Plant
 */

const isPlainObject = require('lodash.isplainobject')

const {parseHeader, parseEntity} = require('./util/type-header')
const {isReadableStream} = require('./util/stream')
const {getMimeMatcher} = require('./util/mime-type-matcher')

const Headers = require('./headers')

/**
 * @typedef {Object} RequestOptions
 * @prop {String} method='GET' Request HTTP method.
 * @prop {URL} url - WebAPI URL object.
 * @prop {Headers|Object.<String,String>} headers={} - Request headers.
 * @prop {ReadableStream|Null} body=null Request body.
 * @prop {Object} data={} Request data extracted from the body.
 * @prop {string} peer Request peer URI.
 */

/**
 * @class
 * @classdesc Plant Request representation object
 *
 * @prop {String} method='GET' - Request method.
 * @prop {URL} url - Wahtwg URL object.
 * @prop {Headers} headers - WebAPI request headers (in immmutable mode).
 * @prop {String[]} domains - Full domains of server splitted by dot `.`.
 * @prop {String} path - Current processing pathname without basePath
 * @prop {String} basePath - Current base url pathname.
 * @prop {Buffer|Null} body - Request body as buffer. Null until received.
 * @prop {Object} data=null - Request data. It can be parsed JSON value or multipart data value.
 */
class Request {
  /**
   * @param  {RequestOptions} options Constructor options.
   * @constructor
   */
  constructor({
    method = 'get',
    headers = {},
    url,
    body = null,
  }) {
    this.url = url
    this.method = method.toUpperCase()
    this.headers = isPlainObject(headers)
      ? new Headers(headers, Headers.MODE_IMMUTABLE)
      : headers
    this.domains = /\.\d+$/.test(this.url.hostname)
      ? []
      : this.url.hostname.split('.').reverse()

    if (body !== null && ! isReadableStream(body)) {
      throw new TypeError('options.body is not a readable stream')
    }

    this.body = body
    this.bodyUsed = false
    this.buffer = null
  }

  /**
   * Check if current request mime type in content-type header is equal `type`.
   *
   * @param  {String} type List of mime types
   * @return {Boolean} Return true if content type header contains specified `types`.
   */
  is(type) {
    const entity = parseEntity(this.headers.get('content-type') || '')

    return entity.type === type
  }

  /**
   * Get request content type from list of types
   * @param {String[]} types List of types to choose one.
   * @returns {String|Null} Return matched type or null if no type matched
   */
  type(types) {
    const _types = normalizeTypes(types)
    const {type} = parseEntity(this.headers.get('content-type'))

    for (const {value, matcher} of _types) {
      if (matcher(type) === true) {
        return value
      }
    }

    return null
  }

  /**
   * Select which one of `types` contains in request's Accept header.
   * @param {String[]} types List of types to choose one.
   * @returns {String|Null} Return matched type or null if no type matched
   */
  accept(types) {
    const _types = normalizeTypes(types)
    const cTypes = parseHeader(this.headers.get('accept'))
    .sort(function (a, b) {
      return (a.params.q - b.params.q)
    })
    .map(function ({type}) {
      return type
    })

    for (const cType of cTypes) {
      for (const {value, matcher} of _types) {
        if (matcher(cType) === true) {
          return value
        }
      }
    }

    return null
  }

  async text() {
    const contentType = this.headers.get('content-type')
    let encoding = 'utf8'
    if (contentType) {
      const charset = charsetFromContentType(contentType)

      if (charset) {
        encoding = charset
      }
    }

    const buffer = await this.arrayBuffer()
    const decoder = new TextDecoder(encoding)

    return decoder.decode(buffer).toString()
  }

  async arrayBuffer() {
    if (this.bodyUsed) {
      return this.buffer
    }

    const result = []
    const reader = this.body.getReader()
    while (true) {
      const {value, done} = await reader.read()
      if (done) {
        break
      }
      result.push(value)
    }
    reader.releaseLock()
    this.buffer = concatUint8Arrays(result)
    this.bodyUsed = true

    return this.buffer
  }

  json() {
    return this.text()
    .then(JSON.parse)
  }

  // blob() {}

  // formData() {}

  clone() {
    const copy = new this.constructor({
      method: this.method,
      url: this.url,
      headers: this.headers,
      body: this.body,
    })

    copy.buffer = this.buffer

    return copy
  }
}

// Naive request groups.
// Usage is: aliases.json('application/json') // -> true
const aliases = {
  json: getMimeMatcher(['application/json', 'application/json+*']),
  text: getMimeMatcher(['text/plain']),
  html: getMimeMatcher(['text/html', 'text/xhtml']),
  image: getMimeMatcher(['image/*']),
}

function normalizeTypes(types) {
  const result = []

  for (const type of types) {
    if (type.includes('/')) {
      result.push({
        value: type,
        matcher(value) {
          return value === type
        },
      })
    }
    else if (aliases.hasOwnProperty(type)) {
      result.push({
        value: type,
        matcher(value) {
          return aliases[type](value)
        },
      })
    }
  }

  return result
}

function concatUint8Arrays(arrays) {
  let length = 0
  for (const array of arrays) {
    length += array.length
  }
  const result = new Uint8Array(length)
  let n = 0
  for (const array of arrays) {
    for (let i = 0; i < array.length; i++, n++) {
      result[n] = array[i]
    }
  }
  return result
}

function charsetFromContentType(contentType) {
  const parts = contentType.split(/;\s+/)

  if (parts.length < 2) {
    return null
  }

  const charset = parts[1]

  if (! charset.startsWith('charset=')) {
    return null
  }

  return charset.slice(8).trim()
}

module.exports = Request
