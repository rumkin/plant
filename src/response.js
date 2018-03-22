const {Readable} = require('stream');
const isObject = require('lodash.isobject');

/**
 * @class
 * @classdesc Plant Response
 *
 * @prop {Number} statusCode - Response status code
 * @prop {Headers} headers - Response headers
 * @prop {Null|String|Readable} body - Response body.
 */
class Response {
  constructor({status = 200, headers = new Headers(), body = null} = {}) {
    this.statusCode = status;
    this.headers = headers;
    this.body = body;
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
    if (isObject(result) && (result instanceof Readable)) {
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
