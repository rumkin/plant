class Headers {
  constructor(_initials = [], mode = 'none') {
    let initials = _initials;
    if (! Array.isArray(_initials)) {
      initials = Object.entries(_initials);
    }

    this._headers = new Map();
    this._mode = 'none';
    initials.forEach(([name, value]) => {
      this.set(name, value);
    });
    this._mode = mode;
  }

  get mode() {
    return this._mode;
  }

  set(_name, _value) {
    if (this._mode !== 'none') {
      throw new TypeError(`Headers mode is ${this._mode}`);
    }

    const name = normalizedName(_name);
    const value = normalizedValue(_value);

    this._headers.set(name, [value]);
  }

  append(_name, _value) {
    if (this._mode !== 'none') {
      throw new TypeError(`Headers mode is ${this._mode}`);
    }

    const name = normalizedName(_name);
    const value = normalizedValue(_value);

    if (this._headers.has(name)) {
      this._headers.get(name).push(value);
    }
    else {
      this._headers.set(name, [value]);
    }
  }

  delete(_name) {
    if (this._mode !== 'none') {
      throw new TypeError(`Headers mode is ${this._mode}`);
    }

    this._headers.delete(
      normalizedName(_name)
    );
  }

  has(_name) {
    return this._headers.has(
      normalizedName(_name)
    );
  }

  get(_name) {
    const name = normalizedName(_name);
    if (! this._headers.has(name)) {
      return '';
    }

    return this._headers.get(name).join(', ');
  }

  keys() {
    return this._headers.keys();
  }

  values() {
    return this._headers.values();
  }

  entries() {
    return this._headers.entries();
  }

  forEach(callback, thisArg) {
    this._headers.forEach(callback, thisArg);
  }
}


/**
 * normalizedName - Normalize HTTP Field name
 *
 * @param  {*} _name HTTP Field name
 * @return {string}  Returns normalized HTTP Field name
 * @throws {TypeError} If string contains unsupported characters
 */
function normalizedName(_name) {
  let name = _name;

  if (typeof name !== 'string') {
    name = String(name);
  }

  if (/[^a-z0-9\-#$%&'*+.\^_`|~\r\n]/i.test(name)) {
    throw new TypeError('Invalid character in header field name');
  }

  return name.toLowerCase();
}


/**
 * normalizedValue - Normalize HTTP Field value.
 *
 * @param  {*} _value Anything convertable to valid HTTP Field value string
 * @return {string}   Normalized HTTP Field value.
 * @throws {TypeError} If value contains new line characters
 */
function normalizedValue(_value) {

  let value = _value;

  if (typeof value !== 'string') {
    value = String(value);
  }

  if (/\r|\n/.test(value)) {
    throw new TypeError('Invalid newline character in header field value');
  }

  return value;
}

module.exports = Headers;
