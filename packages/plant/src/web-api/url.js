if (typeof this.URL === 'object') {
  module.exports = URL;
}
else {
  module.exports = require('url').URL;
}
