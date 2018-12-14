/**
 * @module Plant
 */

const {parseHeader, parseEntity} = require('./util/type-header');
const isPlainObject = require('lodash.isplainobject');
const {isReadableStream} = require('./util/stream');
const {getMimeMatcher} = require('./util/mime-type-matcher');

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
    this.url = (typeof url === 'string')
      ? new URL(url, 'http://localhost')
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

    if (stream !== null && ! isReadableStream(stream)) {
      throw new TypeError('options.stream is not a readable stream');
    }

    this.body = body;
    this.data = data;
    this.stream = stream;
  }

  /**
   * Check if current request mime type in content-type header is equal `type`.
   *
   * @param  {String} type List of mime types
   * @return {Boolean} Return true if content type header contains specified `types`.
   */
  is(type) {
    const entity = parseEntity(this.headers.get('content-type') || '');

    return entity.type === type;
  }

  /**
   * Get request content type from list of types
   * @param {String[]} types List of types to choose one.
   * @returns {String|Null} Return matched type or null if no type matched
   */
  type(types) {
    const _types = normalizeTypes(types);
    const {type} = parseEntity(this.headers.get('content-type'));

    for (const {value, matcher} of _types) {
      if (matcher(type) === true) {
        return value;
      }
    }

    return null;
  }

  /**
   * Select which one of `types` contains in request's Accept header.
   * @param {String[]} types List of types to choose one.
   * @returns {String|Null} Return matched type or null if no type matched
   */
  accept(types) {
    const _types = normalizeTypes(types);
    const cTypes = parseHeader(this.headers.get('accept'))
    .sort((a, b) => (a.params.q - b.params.q))
    .map(({type}) => type);

    for (const cType of cTypes) {
      for (const {value, matcher} of _types) {
        if (matcher(cType) === true) {
          return value;
        }
      }
    }

    return null;
  }
}

// Naive request groups.
// Usage is: aliases.json('application/json') // -> true
const aliases = {
  json: getMimeMatcher(['application/json', 'application/json+*']),
  text: getMimeMatcher(['text/plain']),
  html: getMimeMatcher(['text/html', 'text/xhtml']),
  image: getMimeMatcher(['image/*']),
};

function normalizeTypes(types) {
  const result = [];

  for (const type of types) {
    if (type.includes('/')) {
      result.push({
        value: type,
        matcher(value) {
          return value === type;
        },
      });
    }
    else if (aliases.hasOwnProperty(type)) {
      result.push({
        value: type,
        matcher(value) {
          return aliases[type](value);
        },
      });
    }
  }

  return result;
}

module.exports = Request;
