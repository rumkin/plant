/**
 * @module Plant.TypeUtils
 * @description Plant utils for working with types.
 */

/**
 * @const {Object} asHandler - Proxy handler object for `as` method.
 */
const asHandler = {
  get({target, proto}, name) {
    if (typeof target[name] === 'function' && typeof proto[name] !== 'function') {
      return;
    }
    else {
      return target[name];
    }
  },
  set({target}, name, value) {
    target[name] = value;
    return true;
  },
  has({target, proto}, name) {
    if (typeof target[name] === 'function' && typeof proto[name] !== 'function') {
      return false;
    }
    else {
      return target.hasOwnProperty(name);
    }
  },
};

/**
 * Wrap instance of interface into interface guard. This hide all non-interface
 * methods from user.
 *
 * @example
 *
 *  class Shape {
 *    move(x, y) {
 *      this.x = x;
 *      this.y = y;
 *    }
 *  }
 *
 *  class Rect extends Shape {
 *    fill(color) {
 *      this.color = color;
 *    }
 *  }
 *
 *  const rect = new Rect();
 *  rect.move(10, 5);
 *  rect.fill('red');
 *
 *  const shape = as(rect, Shape);
 *  shape.y; //> 5
 *  shape.fill; // > undefined
 *
 *  shape.move(10, 10);
 *
 *  rect.y; //> 10
 *
 *
 * @param  {Object} target Instance to be wrapped into interface.
 * @param  {Function} wrapper Interface constructor.
 * @return {Object} Proxy instance.
 */
function as(target, wrapper) {
  return new Proxy({target, proto: wrapper.prototype}, asHandler);
}

exports.as = as;
