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
  if (req.headers.has('cookie')) {
    req.cookies = req.headers.raw('cookie')
    .reduce((all, header) => ({
      ...all,
      ...cookie.parse(header),
    }), {});
    req.registeredCookies = Object.getOwnPropertyNames(req.cookies);
  }
  else {
    req.cookies = {};
    req.registeredCookies = [];
  }

  // Set new cookie value
  res.setCookie = responseSetCookie;

  // Remove cookie by name
  res.clearCookie = responseClearCookie;

  // Remove all cookies
  res.clearCookies = responseClearCookies;
}

/**
 * Response extension. Add set-cookie header to response headers.
 *
 * @param  {String} name    Cookie name.
 * @param  {String} value   Cookie value.
 * @param  {Object} options Cookie options like expiration, domain, etc.
 * @return {Response} Returns `this`.
 */
function responseSetCookie(name, value, options) {
  const opts = Object.assign({path: '/'}, options);
  const header = cookie.serialize(name, String(value), opts);

  this.headers.append('set-cookie', header);

  return this;
}

/**
 * Response extension. Add set-cookie header which erases cookie.
 *
 * @param  {String} name    Cookie name.
 * @param  {Object} options Header options like expiration, domain, etc.
 * @return {Response} Returns `this`.
 */
function responseClearCookie(name, options) {
  const opts = Object.assign({expires: new Date(0), path: '/'}, options);
  const header = cookie.serialize(name, '', opts);

  this.headers.append('set-cookie', header);

  return this;
}

/**
 * Response extension. Remove all cookies passed in request.
 *
 * @param  {Object} options Header options.
 * @return {Response} Returns `this`.
 */
function responseClearCookies(options) {
  this.registeredCookies.forEach((cookieName) => {
    this.clearCookie(cookieName, options);
  });

  return this;
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
