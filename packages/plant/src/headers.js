/**
 * @module Http.Headers
 * @description WebAPI Headers implementation.
 */

/**
 * @const {String} MODE_NONE - None mode flag. This mode allow Headers modification.
 */
const MODE_NONE = 'none'
/**
 * @const {String} MODE_IMMUTABLE - Immutable mode falg. This mode deny Headers modification.
 */
const MODE_IMMUTABLE = 'immutable'

/**
 * @typedef {ObjectInitials|ArrayInitials} HeadersInitials - Initial values for Headers. Could be object of strings or entires list.
 */
/**
 * @typedef {Object.<String,String>} ObjectInitials Header initials as Object
 */
/**
 * @typedef {Array.<Array.<String,String>>} ArrayInitials Header initials as array of entries.
 */

/**
 * @class
 * @classdesc WebAPI Headers implementation.
 */
class Headers {
  /**
   * @param  {HeadersInitials} initials = [] Header initial value.
   * @param  {String} mode = MODE_NONE Headers object mode.
   * @return {Headers} Headers instance
   * @constructor
   */
  constructor(initials = [], mode = MODE_NONE) {
    if (! Array.isArray(initials)) {
      initials = Object.entries(initials)
    }

    this._headers = new Map(initials.map(([key, value]) => ([key, [value]])))
    this._mode = mode

    if (mode !== MODE_NONE) {
      this.set =
      this.append =
      this.delete =
      this.wrongMode
    }
  }

  /**
   * Headers mode getter.
   *
   * @return {String} Should returns MODE_NONE or MODE_IMMUTABLE value.
   */
  get mode() {
    return this._mode
  }

  /**
   * Set header value. Overwrite previous values.
   *
   * @param  {String} _name  Header name.
   * @param  {String} _value Header value.
   * @returns {void}
   * @throws {Error} Throws if current mode is immutable.
   */
  set(_name, _value) {
    const name = normalizedName(_name)
    const value = normalizedValue(_value)

    this._headers.set(name, [value])
  }

  /**
   * Append header. Preserve previous values.
   *
   * @param  {String} _name  Header name.
   * @param  {String} _value Header value.
   * @returns {void}
   * @throws {Error} Throws if current mode is immutable.
   */
  append(_name, _value) {
    const name = normalizedName(_name)
    const value = normalizedValue(_value)

    if (this._headers.has(name)) {
      this._headers.get(name).push(value)
    }
    else {
      this._headers.set(name, [value])
    }
  }

  /**
   * Remove header from headers list
   *
   * @param  {String} _name Header name.
   * @return {void}
   * @throws {Error} Throws if current mode is immutable.
   */
  delete(_name) {
    this._headers.delete(
      normalizedName(_name)
    )
  }

  /**
   * Specify whether header with name is contained in Headers list.
   *
   * @example
   *
   *  headers.set('accept', 'text/plain')
   *  headers.has('accept')
   *  // > true
   *  headers.delete('accept')
   *  headers.has('accept')
   *  // > false
   * @param  {String} _name Header name
   * @return {Boolean} Returns true if one or more header values is set.
   */
  has(_name) {
    return this._headers.has(
      normalizedName(_name)
    )
  }

  /**
   * Return header value by name. If there is several headers returns all of them
   * concatenated by `, `.
   *
   * @example
   *
   *  headers.set('accept', 'text/plain')
   *  headers.get('accept')
   *  // > "text/plain"
   *  headers.append('accept', 'text/html')
   *  headers.get('accept')
   *  // > "text/plain, text/html"
   *
   * @param  {String} _name Header name
   * @return {String} Concatenated header values.
   */
  get(_name) {
    const name = normalizedName(_name)
    if (! this._headers.has(name)) {
      return ''
    }

    return this._headers.get(name).join(', ')
  }

  /**
   * Return iterator of header names.
   *
   * @return {Iterable.<String>} Iterator of header names.
   */
  keys() {
    return this._headers.keys()
  }

  /**
   * Return iterator of headers values.
   *
   * @return {Iterator.<Array.<String>>} Iterator of each header values.
   */
  values() {
    return Array.from(this._headers.values())
    .map((value) => value.join(', '))
    [Symbol.iterator]()
  }

  /**
   * Returns iterator of entries.
   *
   * @return {Iterator.<Array>} Return iterator of Object.entries alike values.
   */
  entries() {
    return Array.from(this._headers.entries())
    .map(([name, value]) => [name, value.join(', ')])
    [Symbol.iterator]()
  }

  /**
   * Call `callback` for each header entry.
   *
   * @param  {function(Array.<String>,String)} fn Function that calls for each hander entry.
   * @param  {type} thisArg  This value for function.
   * @returns {void} Returns no value.
   */
  forEach(fn, thisArg = this) {
    this._headers.forEach((values, key) => {
      fn(values.join(', '), key, thisArg)
    }, thisArg)
  }

  /**
   * Throw TypeError with prevent changes message.
   *
   * @return {void} No return value.
   * @throws {TypeError} Everytime it's called.
   * @private
   */
  wrongMode() {
    throw new TypeError(`Headers mode is ${this.mode}`)
  }

  /**
   * Not standard. Get raw header value as array of strings. Not concatenated
   * into string. If header not exists returns empty array.
   *
   * @param  {String} name Header name.
   * @return {String[]} List of passed header values.
   */
  raw(name) {
    if (this.has(name)) {
      return this._headers.get(name)
    }
    else {
      return []
    }
  }
}

Headers.MODE_NONE = MODE_NONE
Headers.MODE_IMMUTABLE = MODE_IMMUTABLE

/**
 * Normalize HTTP Field name
 *
 * @param  {*} _name HTTP Field name
 * @return {String}  Returns normalized HTTP Field name
 * @throws {TypeError} If string contains unsupported characters
 */
function normalizedName(_name) {
  let name = _name

  if (typeof name !== 'string') {
    name = String(name)
  }

  if (/[^a-z0-9\-#$%&'*+.\^_`|~\r\n]/i.test(name)) {
    throw new TypeError('Invalid character in header field name')
  }

  return name.toLowerCase()
}

/**
 * Normalize HTTP Field value.
 *
 * @param  {*} _value Anything convertable to valid HTTP Field value string
 * @return {String}   Normalized HTTP Field value.
 * @throws {TypeError} If value contains new line characters
 */
function normalizedValue(_value) {

  let value = _value

  if (typeof value !== 'string') {
    value = String(value)
  }

  if (/\r|\n/.test(value)) {
    throw new TypeError('Invalid newline character in header field value')
  }

  return value
}

module.exports = Headers
