
/**
 * @class
 * @classdesc Peer represents the other side of connection.
 */
class Peer {
  /**
   * @param  {object} options Peer options
   * @param {URI} options.uri Peer URI
   * @constructor
   */
  constructor({uri}) {
    this.uri = uri
  }
}

module.exports = Peer
