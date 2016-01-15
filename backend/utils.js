/**
 * Some utilities functions.
 * @module sms-library-helper/backend/utils
 * @author Holi0317 <holliswuhollis@gmail.com>
 * @license MIT
 *
 * @requires bluebird
 */

'use strict';

let Promise = require('bluebird');

/**
 * The exception to be thrown when a promise is broken (have exception) and it is already handled.
 * Useful when it comes to response handling as response cannot be sent twice.
 * @example
makePromise
.then(throwRandomError)
.catch(err => {
  handleErr(err);
  throw new BreakSignal();
})
.then(otherStuffs)
.catch(err => {
  if (err instanceof BreakSignal) return
  handleErr2(err);
});
 * @class
 * @extends Error
 */
module.exports.BreakSignal = function BreakSignal() {};
module.exports.BreakSignal.prototype = Error.prototype;

/**
 * Supress all error when exception is thrown.
 * @example
makePromise()
.then(throwError)
.catch(catchThenThrowAnotherError)
.then(otherStuffs)
.catch(catchIgnore);
// otherStuffs will not be executed, while there will be nothing printed on console.
 * @returns {Promise} - emptyPromise
 */
module.exports.catchIgnore = function catchIgnore() {
  return Promise.resolve();
};

/**
 * Returns difference between two arrays (Delta comparing).
 * However, only items that a have but not in b will be returned. See example for a better
 * explain.
 *
 * @example
 * utils.diff([1, 2, 3], [3, 4, 5]); // Returns [1, 2], but not [1, 2, 4, 5]
 *
 * @param {Array} a - One of the arrays to be compaired.
 * @param {Array} b - The other array to be compaired.
 * @see http://stackoverflow.com/questions/1187518/javascript-array-difference
 */
module.exports.diff = function (a, b) {
  return a.filter(function(i) {
    return b.indexOf(i) < 0;
  });
}
