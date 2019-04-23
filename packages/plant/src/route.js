class Route {
  static fromRequest(req) {
    return new this({
      path: req.url.pathname,
      basePath: '/',
      params: {},
    })
  }

  constructor({
    path = '/',
    basePath = '',
    params = {},
    captured = [],
  } = {}) {
    this.path = path
    this.basePath = basePath
    this.params = Object.freeze(params)
    this.captured = Object.freeze(captured)
  }

  clone() {
    const copy = new this.constructor({
      path: this.path,
      basePath: this.basePath,
      params: this.params,
      captured: this.captured,
    })

    return copy
  }

  extend({
    path = path,
    basePath = this.basePath,
    params = this.params,
    captured = this.captured,
  }) {
    this.path = path
    this.basePath = basePath
    this.params = Object.freeze(params)
    this.captured = Object.freeze(captured)
    return this
  }

  capture(path, params = {}) {
    path = path.replace(/\/$/, '')

    if (! path.length) {
      throw new Error('Empty path not allowed')
    }

    if (path[0] !== '/') {
      path = '/' + path
    }

    if (! this.path.startsWith(path)) {
      throw new Error('Current path does not start with provided path value')
    }
    else if (this.path.length !== path.length && this.path[path.length] !== '/') {
      throw new Error('Provided path has unexpected ending')
    }

    this.path = this.path.slice(path.length)
    this.basePath = this.basePath + path
    this.params = Object.freeze({...this.params, ...params})
    this.captured.push({
      path,
      params,
    })

    return this
  }
}

module.exports = Route
