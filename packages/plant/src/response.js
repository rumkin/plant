/**
 * @module Plant
 */

const isObject = require('lodash.isobject');
const isPlainObject = require('lodash.isplainobject');
const {isReadableStream} = require('./util/stream');

const Headers = require('./headers');

/**
 * @class
 * @classdesc Plant Response
 *
 * @prop {Number} statusCode - Response status code
 * @prop {Headers} headers - Response headers
 * @prop {Null|Buffer|String|Readable} body - Response body.
 */
class Response {
  /**
   * @typedef {Object} ResponseOptions Options for Response constructor.
   * @param {Number} statusCode=200 Response status code.
   * @param {Headers|Object} [headers] Response headers.
   * @param {String|Buffer|Readable|Null} body=null Response body.
   */
  /**
   * @param {Response.Options} options={} Response options object.
   * @throws {Error} If passed headers has immutable mode.
   * @constructor
   */
  constructor({statusCode = 200, headers = new Headers(), body = null} = {}) {
    this.statusCode = statusCode;

    if (isPlainObject(headers)) {
      this.headers = new Headers(headers);
    }
    else if (headers.mode === Headers.MODE_IMMUTABLE) {
      throw new Error(`Invalid headers mode: ${headers.mode}`);
    }
    else {
      this.headers = headers;
    }

    this.body = body;
  }

  /**
   * Specify whether response is successful and returns status code in
   * range of 200 and 299.
   *
   * @type {Boolean} True when status code is in success range.
   */
  get ok() {
    return this.statusCode > 199 && this.statusCode < 300;
  }

  /**
   * Specify whether body is set.
   *
   * @type {Boolean} True if body is not null.
   */
  get hasBody() {
    return this.body !== null;
  }

  /**
   * status - Set response status
   *
   * @param  {Number} status Response status code
   * @return {Response} Return `this`.
   */
  status(status) {
    this.statusCode = status;
    return this;
  }

  /**
   * json - Set response type as JSON and set body content and set application/json mimetype.
   *
   * @param  {*} result Value to stringify.
   * @return {Response} Return `this`.
   */
  json(result) {
    this.body = JSON.stringify(result);
    this.headers.set('content-type', 'application/json');

    return this;
  }

  /**
   * text - Set plain text body content and text/plain mimetype.
   *
   * @param  {String} result Response body
   * @return {Response} Returns `this`
   */
  text(result) {
    this.headers.set('content-type', 'text/plain');
    this.body = result;

    return this;
  }

  /**
   * html - Set html body content and text/html mime type.
   *
   * @param  {String} result HTML response content.
   * @return {Response} Returns `this`
   */
  html(result) {
    this.headers.set('content-type', 'text/html');
    this.body = result;

    return this;
  }

  /**
   * stream - Set stream as response body.
   *
   * @param  {Readable} stream Readable stream to send.
   * @return {Response}  Returns `this`.
   */
  stream(stream) {
    if (typeof stream.pipe !== 'function') {
      throw new TypeError('Not a Stream');
    }

    this.body = stream;

    return this;
  }

  /**
   * send - Detect response type and set proper body value.
   *
   * @param  {String|Readable} result Result body.
   * @return {Response}  Returns `this`.
   */
  send(result) {
    if (isObject(result) && isReadableStream(result)) {
      this.stream(result);
    }
    else {
      this.body = String(result);
    }

    return this;
  }

  /**
   * end - Set empty response body.
   *
   * @return {Response}  Returns `this`.
   */
  end() {
    this.body = '';
    return this;
  }

  /**
   * redirect - Send empty body and location header. Set status to 302.
   *
   * @param  {String} url Destination url.
   * @return {Response} returns `this`.
   */
  redirect(url) {
    this.statusCode = 302;
    this.headers.set('location', url);
    this.body = '';

    return this;
  }
}

module.exports = Response;
