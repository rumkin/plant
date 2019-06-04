/**
 * @module Plant.Socket
 */

const EventEmitter = require('eventemitter3')

const Peer = require('./peer')

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
  constructor({peer, onEnd = noop, onPush = null} = {}) {
    super()

    if (onPush !== null) {
      if (typeof onPush !== 'function') {
        throw new TypeError('options.onPush should be undefined, null or a function')
      }
    }

    if (peer instanceof Peer === false) {
      throw new TypeError('options.peer should be instance of a Peer')
    }

    this._peer = peer
    this._isEnded = false
    this._end = onEnd
    this._push = onPush
  }

  /**
   * get canPush - specify wether socket is available to push responses.
   *
   * @return {bool} true if constructor's options.onPush function is defined.
   */
  get canPush() {
    return this._push !== null
  }

  /**
   * Tell if socket was aborted or ended by application.
   *
   * @return {Boolean} True if socket could not write.
   */
  get isEnded() {
    return this._isEnded
  }

  /**
   * get peer - connection peer instance
   *
   * @return {Peer} Peer associated with the socket
   */
  get peer() {
    return this._peer
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
