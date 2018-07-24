/**
 * @module Plant.Socket
 */

const {EventEmitter} = require('events');

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
   * @param  {Readable} connection Readable stream.
   * @constructor
   */
  constructor({onEnd = noop} = {}) {
    super();

    this._isEnded = false;
    this._end = onEnd;
  }

  /**
   * Tell if socket was aborted or ended by application.
   *
   * @return {Boolean} True if socket could not write.
   */
  get isEnded() {
    return this._isEnded;
  }

  /**
   * End socket and make it
   *
   * @return {void} No return value.
   */
  end() {
    if (this._isEnded) {
      return;
    }

    this._isEnded = true;
    this._end();
  }

  destroy() {
    this.emit('destroy');
  }
}

module.exports = Socket;
