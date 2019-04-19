/**
 * @module Plant.Socket
 */

const EventEmitter = require('eventemitter3')

function noop() {}

/**
 * @class
 * @name Socket
 * @classdesc Socket wraps connection object like a transform stream and provide
 * methods to manipulate socket state.
 * @prop {Boolean} isEnded Specify was socket ended or not.
 */
class Socket extends EventEmitter {
  /**
   * @param  {Object} options Socket options.
   * @param {Function} [options.onEnd] Callback triggered when end event is emitted.
   * @param {function(Response):Promise<Response,Error>} [options.onPush] Callback triggered when push requested by server. It should be set  only when socket support pushes.
   * @constructor
   */
  constructor({onEnd = noop, onPush = null} = {}) {
    super()

    if (onPush !== null) {
      if (typeof onPush !== 'function') {
        throw new TypeError('options.onPush should be null or a function')
      }
    }

    this._isEnded = false
    this._end = onEnd
    this._push = onPush
  }

  /**
   * Tell if socket was aborted or ended by application.
   *
   * @return {Boolean} True if socket could not write.
   */
  get isEnded() {
    return this._isEnded
  }

  get canPush() {
    return this._push !== null
  }

  /**
   * End socket and make it
   *
   * @return {void} No return value.
   */
  end() {
    if (this._isEnded) {
      return
    }

    this._isEnded = true
    this._end()
  }

  destroy() {
    this.emit('destroy')
  }

  /**
   * push - Push response to the client
   *
   * @param  {Response} response Plant Response instance
   * @return {Promise<Response,Error>} Returns Promise resolved with sent response.
   */
  push(response) {
    if (! this.canPush) {
      throw new Error('This socket could not push')
    }

    return this._push(response)
    .then(function() {
      return response
    })
  }
}

module.exports = Socket
