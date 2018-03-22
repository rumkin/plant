const typeIs = require('type-is');
const {as} = require('./utils/types');
const {Readable} = require('stream');

/**
 * @class
 * @classdesc Plant Request representation object
 *
 * @prop {String} sender - Sender URI: IP or url.
 * @prop {Object} url - URL as object returned from method `url.parse`.
 * @prop {String} method - Request method.
 * @prop {Headers} headers - Request headers.
 * @prop {String[]} domains - Full domains of server splitted by dot `.`.
 * @prop {String} path - Current processing pathname without basePath
 * @prop {String} basePath - Current base url pathname.
 * @prop {Buffer|Null} body - Request body as buffer. Null until received.
 * @prop {Object} data - Request data. It can be parsed JSON value or multipart data value.
 * @prop {Readable} stream - Request body read stream.
 */
class Request {
  constructor({sender, headers, url, method, origin}) {
    this.sender = sender;
    this.url = url;
    this.method = method;
    this.headers = headers;
    this.domains = /\.\d+$/.test(url.hostname)
      ? []
      : url.hostname.split('.').reverse();
    this.path = url.pathname.replace(/\/+/g, '/');
    this.basePath = '/';

    this.body = null;
    this.data = {};

    Object.defineProperty(this, 'stream', {
      get() {
        return as(origin, Readable);
      },
    });
  }

  /**
   * is - Check if current request has mime type in Content-Type header.
   *
   * @param  {String|String[]} types List of mime types
   * @return {Boolean} Return true if content type header contains specified `types`.
   */
  is(types) {
    return typeIs.is(this.headers.get('content-type'), types);
  }
}

module.exports = Request;
