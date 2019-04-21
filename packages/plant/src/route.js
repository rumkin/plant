class Route {
  static fromRequest(req) {
    return new this({
      path: req.url.pathname,
      basePath: '/',
      params: {},
    })
  }

  constructor({path = '/', basePath = '/', params = {}} = {}) {
    this.path = path
    this.basePath = basePath
    this.params = params
  }

  clone() {
    const copy = new this.constructor({
      path: this.path,
      basePath: this.basePath,
      params: {...this.params},
    })

    return copy
  }

  extend(props) {
    return new this.constructor({
      ...this,
      ...props,
    })
  }

  instantiate(props) {
    return new this.constructor(props)
  }
}

module.exports = Route
