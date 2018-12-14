const escapeRegExp = require('lodash.escaperegexp');

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

function stringMatcher(origin) {
  if (origin.includes('*')) {
    return regExpMatcher(toRegExp(origin));
  }

  return function(value) {
    return value === origin;
  };
}

function regExpMatcher(regexp) {
  return function(value) {
    return regexp.test(value);
  };
}

function toRegExp(mask) {
  const re = mask.split('*').map(escapeRegExp).join('[^\/]+');

  return new RegExp('^' + re + '$');
}

exports.getMimeMatcher = getMimeMatcher;
