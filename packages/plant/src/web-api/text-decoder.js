if (typeof this.TextDecoder !== 'undefined') {
  module.exports = TextDecoder;
}
else {
  const {StringDecoder} = require('string_decoder');

  class TextDecoder {
    constructor(encoding) {
      this.decoder = new StringDecoder(encoding);
    }

    decode(buffer) {
      return this.decoder.write(buffer);
    }
  }
  module.exports = TextDecoder;
}
