/**
* @module Plant.Handlers.Cookie
* @description Common Http Request and Response handlers.
*/

const cookie = require('cookie');

/**
 * Adds methods to set cookies and current cookie data object.
 *
 * @param  {Request} req - Plant.Request instance
 * @param  {Response} res - Plant.Response instance
 * @return {void}
 */
function addCookieSupport(req, res) {
  if (req.headers.hasOwnProperty('cookie')) {
    req.cookies = cookie.parse(req.headers.cookie);
  }
  else {
    req.cookies = {};
  }

  // Set new cookie value
  res.setCookie = function(cookieName, value, options) {
    const opts = Object.assign({path: '/'}, options);
    const headerValue = cookie.serialize(cookieName, String(value), opts);

    res.headers.append('set-cookie', headerValue);

    return this;
  };

  // Remove cookie by name
  res.clearCookie = function(cookieName, options) {
    const opts = Object.assign({expires: new Date(1), path: '/'}, options);
    const value = cookie.serialize(cookieName, '', opts);

    this.headers.append('set-cookie', value);

    return this;
  };

  // Remove all cookies
  res.clearCookies = function(options) {
    Object.getOwnPropertyNames(req.cookies)
    .forEach((cookieName) => {
      this.clearCookie(cookieName, options);
    });
  };
}

/**
 * Add cookie controlls to request and response objects.
 *
 * @param  {Plant.Context} context Plant Context.
 * @param  {function(Object?)} next Next cascade handler emitter.
 * @returns {void} Returns nothing.
 */
function cookieHandler({req, res}, next) {
  addCookieSupport(req, res);
  return next();
}

module.exports = cookieHandler;
