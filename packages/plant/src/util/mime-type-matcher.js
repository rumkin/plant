const escapeRegExp = require('lodash.escaperegexp');

/**
 * getMimeMatcher - create mime type matcher function wich determines weather
 * passed `type` matches `types`,
 *
 * @param  {Array<String|RegExp>} types List of types.
 * @return {function(String):Boolean} Type matcher function.
 */
function getMimeMatcher(types) {
  const matchers = types.map((type) => {
    if (typeof type === 'string') {
      return stringMatcher(type);
    }
    else if (type instanceof RegExp) {
      return regExpMatcher(type);
    }
    else {
      throw new Error('Unknown type');
    }
  });

  return function(value) {
    for (const matcher of matchers) {
      if (matcher(value)) {
        return true;
      }
    }
    return false;
  };
}

/**
 * stringMatcher - Return matcher function. If `origin` contains '*' it will
 * convert string to regexp and call regExpMatcher. Other way it will return
 * a function which check strings equality.
 *
 * @param  {String} origin Mime type or mime type mask.
 * @return {function(String):Boolean} returns matcher function.
 */
function stringMatcher(origin) {
  if (origin.includes('*')) {
    return regExpMatcher(toRegExp(origin, '[^\/]+'));
  }

  return function(value) {
    return value === origin;
  };
}

/**
 * regExpMatcher - return regexp matcher function.
 *
 * @param  {RegExp} regexp Regular exression to match with.
 * @return {function(String):Boolean} Returns matcher function.
 */
function regExpMatcher(regexp) {
  return function(value) {
    return regexp.test(value);
  };
}

/**
 * toRegExp - Convert text `mask` to regular expression. Asterisk will be replaced
 * with `replacer`.
 *
 * @param  {String} mask String containing asterisk.
 * @param  {String} replacer Regular expression to substitute of asterisk.
 * @return {RegExp}      Regular expression.
 */
function toRegExp(mask, replacer = '.+?') {
  const re = mask.split('*').map(escapeRegExp).join(replacer);

  return new RegExp('^' + re + '$');
}

exports.getMimeMatcher = getMimeMatcher;
