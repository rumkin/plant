/**
 * @module Plant
 */

const isObject = require('lodash.isobject')
const isPlainObject = require('lodash.isplainobject')
const statuses = require('statuses')

const {isReadableStream} = require('./util/stream')
const Request = require('./request')
const Headers = require('./headers')
const TypedArray = Object.getPrototypeOf(Uint8Array)

/**
 * @typedef Push
 * @prop {Request|null} request Request instance.
 * @prop {Response|null} response Response instance if request already completed.
 * @prop {Object|null} context Context for request.
 */

/**
 * @class
 * @classdesc Plant Response
 *
 * @prop {Number} status - Response status code
 * @prop {URL} url - Response URL
 * @prop {Headers} headers - Response headers
 * @prop {Null|TypedArray|String|Readable} body - Response body.
 */
class Response {
  /**
   * @typedef {Object} ResponseOptions Options for Response constructor.
   * @param {Number} status=200 Response status code.
   * @param {URL} url Response url.
   * @param {Headers|Object} [headers] Response headers.
   * @param {String|TypedArray|Readable|Null} body=null Response body.
   */
  /**
   * @param {Response.Options} options={} Response options object.
   * @throws {Error} If passed headers has immutable mode.
   * @constructor
   */
  constructor({
    url,
    status = 200,
    headers = new Headers(),
    body = null,
  } = {}) {
    this.status = status

    if (isPlainObject(headers)) {
      this.headers = new Headers(headers)
    }
    else if (headers.mode === Headers.MODE_IMMUTABLE) {
      throw new Error(`Invalid headers mode: ${headers.mode}`)
    }
    else {
      this.headers = headers
    }

    if (body !== null) {
      if (! isAcceptableBody(body)) {
        throw new TypeError('Body should be a string, TypedArray, ReadableStream or null')
      }
    }

    this._url = url
    this._body = body
    this._pushes = []
  }

  /**
   * Specify whether response is successful and status code is in
   * range of 200 and 299.
   *
   * @readonly
   * @type {Boolean}
   */
  get ok() {
    return this.status > 199 && this.status < 300
  }

  /**
   * Response URL property.
   *
   * @readonly
   * @type {URL}
   */
  get url() {
    return this._url
  }

  /**
   * Specify whether body is set. True if body is not null.
   *
   * @readonly
   * @type {Boolean}
   */
  get hasBody() {
    return this.body !== null
  }

  /**
   * Determine wether response has pushes.
   *
   * @readonly
   * @type {boolean}
   */
  get hasPushes() {
    return this._pushes.length > 0
  }

  /**
   * Response body
   *
   * @type {string|TypedArray|ReadableStream|null}
   */
  get body() {
    return this._body
  }

  set body(value) {
    if (value === null) {
      this.headers.delete('content-length')
      this.headers.delete('content-type')
    }
    else if (isReadableStream(value)) {
      this._body = value
    }
    else if (typeof value === 'string' || value instanceof TypedArray) {
      this._body = value
      this.headers.set('content-length', value.length)
    }
    else {
      throw new TypeError('Body value could be a string, TypedArray, ReadableStream or null')
    }
  }
  /**
   * Retun list of pushed responses and requests.
   *
   * @readonly
   * @type {Push[]}
   */
  get pushes() {
    return [...this._pushes]
  }

  /**
   * get statusText - returns status text for current status code.
   *
   * @return {string} Status code string value
   */
  get statusText() {
    return statuses[this.status]
  }

  /**
   * setStatus - Set response status
   *
   * @param  {Number} status Response status code
   * @return {Response} Return `this`.
   */
  setStatus(status) {
    this.status = status
    return this
  }

  /**
   * json - Set response type as JSON and set body content and set application/json mimetype.
   *
   * @param  {*} result Value to stringify.
   * @return {Response} Return `this`.
   */
  json(result) {
    this.body = JSON.stringify(result)
    this.headers.set('content-type', 'application/json')

    return this
  }

  /**
   * text - Set plain text body content and text/plain mimetype.
   *
   * @param  {String} result Response body
   * @return {Response} Returns `this`
   */
  text(result) {
    this.body = result
    this.headers.set('content-type', 'text/plain')

    return this
  }

  /**
   * html - Set html body content and text/html mime type.
   *
   * @param  {String} result HTML response content.
   * @return {Response} Returns `this`
   */
  html(result) {
    this.body = result
    this.headers.set('content-type', 'text/html')

    return this
  }

  /**
   * stream - Set stream as response body.
   *
   * @param  {Readable} stream Readable stream to send.
   * @return {Response}  Returns `this`.
   */
  stream(stream) {
    if (! isReadableStream(stream)) {
      throw new TypeError('Not a ReadableStream')
    }

    this._body = stream

    return this
  }

  /**
   * send - Detect response type and set proper body value.
   *
   * @param  {String|ReadableStream} body Result body.
   * @return {Response}  Returns `this`.
   */
  send(body) {
    if (isObject(body) && isReadableStream(body)) {
      this._body = body
    }
    else {
      this.body = body
    }

    return this
  }

  /**
   * end - Set empty response body.
   *
   * @return {Response}  Returns `this`.
   */
  empty() {
    this.headers.delete('content-type')
    this.body = ''
    return this
  }

  /**
   * redirect - Send empty body and location header. Set status to 302.
   *
   * @param  {String} url Destination url.
   * @return {Response} returns `this`.
   */
  redirect(url) {
    this.status = 302
    this.headers.set('location', url)
    this.empty()

    return this
  }

  /**
   * Add request or response into response pushes list. It's using for transports
   * which support pushes.
   *
   * @param  {Response|Request|URL} target Complete response or new request.
   * @param  {Object} [context] Context is optional and is using when overriding is required.
   * @return {Response} Return itself
   * @throws {TypeError} if the first argument type is mismatched.
   */
  push(target, context) {
    if (target instanceof Response) {
      this._pushes.push({
        request: null,
        context: null,
        response: target,
      })
    }
    else if (target instanceof Request) {
      this._pushes.push({
        request: target,
        context,
        response: null,
      })
    }
    else if (target instanceof URL) {
      this._pushes.push({
        request: new Request({
          url: target,
        }),
        context,
        response: null,
      })
    }
    else {
      throw new TypeError('Argument #1 could be a Response, Request or URL')
    }

    return this
  }
}

function isAcceptableBody(body) {
  return typeof body === 'string'
  || isReadableStream(body)
  || body instanceof TypedArray
}

module.exports = Response
