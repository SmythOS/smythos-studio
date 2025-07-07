/**
 * Create an object composed of the picked object properties
 * @param {Object} object
 * @param {string[]} keys
 * @returns {Object}
 */

type AnyObject = {
  [x: string]: any;
};

const pick = (object: AnyObject, keys: string[]) =>
  keys.reduce((newObject: AnyObject, key) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
      // eslint-disable-next-line no-param-reassign
      newObject[key] = object[key];
    }
    return newObject;
  }, {});

export { pick };
