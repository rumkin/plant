/**
 * @class
 * @classdesc This is a URI object representation
 */
class URI {
  constructor(uri) {
    if (typeof uri === 'string') {
      throw new Error('URI parsing not implemented yet')
    }

    this.setParams(uri)
  }

  setParams({
    protocol = '',
    username = '',
    password = '',
    hostname = '',
    port = '',
    pathname = '/',
    query = '',
    fragment = '',
  }) {
    this.protocol = protocol
    this.username = username
    this.password = password
    this.hostname = hostname
    this.port = port
    this.pathname = pathname
    this.query = query
    this.fragment = fragment

    return this
  }

  get host() {
    if (this.port) {
      return `${this.hostname}:${this.port}`
    }
    else {
      return `${this.hostname}`
    }
  }

  toString() {
    const parts = []
    if (this.protocol) {
      parts.push(this.protocol)
    }
    parts.push(`//${this.host}`)
    parts.push(this.pathname)
    if (this.query.length) {
      parts.push(this.query)
    }
    if (this.fragment.length) {
      parts.push(this.fragment)
    }

    return parts.join('')
  }
}

module.exports = URI
