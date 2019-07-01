'use strict';

const oauth  = require('./oauth');
const user   = require('./user');
const client = require('./client');
const token  = require('./token');

// Initialize model modules.
module.exports = {
  oauth,
  user,
  client,
  token
};

/**
 * Initialize model object. Call this before all test.
 *
 * @param {Object} model The model object to be used.
 */
module.exports.init = function(model) {
  oauth.init(model);
  user.init(model);
  client.init(model);
  token.init(model);
};

/**
 * To generate the hash value of a given string.
 *
 * @param {string} str The string to generate hash value.
 * @param {string} salt Salt for hash.
 * @returns {string} The hash value.
 */
module.exports.getHash = function(str, salt) {
  return require('crypto').pbkdf2Sync(str, salt, 20, 64, 'sha256')
    .toString('hex');
};
