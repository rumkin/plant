/**
 * @module Plant
 */
const {URL} = require('url');
const typeIs = require('type-is');
const isPlainObject = require('lodash.isplainobject');

const Headers = require('./headers');

/**
 * @typedef {Object} RequestOptions
 * @prop {String} method='get' Request HTTP method.
 * @prop {URL|String} url - Whatwg URL object or full url string.
 * @prop {Headers|Object.<String,String>} headers={} - Request headers.
 * @prop {Buffer|Null} body=null Request body.
 * @prop {Object} data={} Request data extracted from the body.
 * @prop {Readable} stream=null Request body stream.
 * @prop {string} sender Request sender URI.
 */

/**
 * @class
 * @classdesc Plant Request representation object
 *
 * @prop {String} method='get' - Request method.
 * @prop {URL} url - Wahtwg URL object.
 * @prop {Headers} headers - Whatwg request headers (in immmutable mode).
 * @prop {String} sender - Sender URI. Usually IP.
 * @prop {String[]} domains - Full domains of server splitted by dot `.`.
 * @prop {String} path - Current processing pathname without basePath
 * @prop {String} basePath - Current base url pathname.
 * @prop {Buffer|Null} body - Request body as buffer. Null until received.
 * @prop {Object} data - Request data. It can be parsed JSON value or multipart data value.
 * @prop {Readable} stream - Request body read stream.
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
    data = {},
    stream = null,
    sender = '',
  }) {
    this.url = typeof url === 'string'
      ? new URL(url)
      : url;
    this.method = method.toLowerCase();
    this.headers = isPlainObject(headers)
      ? new Headers(headers, Headers.MODE_IMMUTABLE)
      : headers;
    this.domains = /\.\d+$/.test(this.url.hostname)
      ? []
      : this.url.hostname.split('.').reverse();
    this.sender = sender;

    this.path = this.url.pathname.replace(/\/+/g, '/');
    this.basePath = '/';

    this.body = body;
    this.data = data;
    this.stream = stream;
  }

  /**
   * Check if current request has mime type in Content-Type header.
   *
   * @param  {String} type List of mime types
   * @return {Boolean} Return true if content type header contains specified `types`.
   */
  is(type) {
    return typeIs.is(this.headers.get('content-type'), [type]) !== false;
  }

  /**
   * Get request supported types
   * @param {String[]} types List of types to choose one.
   * @returns {String|Null} Return matched type or null if no type match found
   */
  type(types) {
    const type = typeIs.is(this.headers.get('content-type'), types);

    if (type === false) {
      return null;
    }
    else {
      return type;
    }
  }
}

module.exports = Request;
