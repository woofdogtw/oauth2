/**
 * This module integrates all model functions for OAuth2, user, client
 * management. You can fine tune all functions with proper database.
 *
 * @module model/Index
 */
'use strict';

const config  = require('../configs/oauth2');

/**
 * @typedef {Object} ClientInfo
 * @property {string} id Client ID.
 * @property {Date} created Creation time.
 * @property {string} clientSecret Client secret.
 * @property {string[]} redirectUris Allowed redirect URIs.
 * @property {?string[]} scopes Allowed scopes. `null` means administrator
 *           client.
 * @property {string[]} grants Allowed grant types.
 * @property {string} userId Developer's user ID.
 * @property {string} name Client name.
 * @property {string} image Image URL.
 */

/**
 * @typedef {Object} UserInfo
 * @property {string} userId User ID.
 * @property {string} email E-mail address.
 * @property {Date} created Creation time.
 * @property {?Date} validated Validation time.
 * @property {?Date} expired Expired time.
 * @property {boolean} disabled Mark this account disabled.
 * @property {Object.<string,boolean>} roles Roles.
 * @property {string} password Password.
 * @property {string} name Display name.
 * @property {Object} info Other information such as address, telephone number,
 *           ...
 */

if (config.oauth2.db.engine === 'mongodb') {
  const mongodb = require('./oauth2-mongodb');
  module.exports = {
    oauth: mongodb.oauth,
    user: mongodb.user,
    client: mongodb.client,
    token: mongodb.token
  };
} else if (config.oauth2.db.engine === 'sqlite3') {
  const sqlite3 = require('./oauth2-sqlite3');
  module.exports = {
    oauth: sqlite3.oauth,
    user: sqlite3.user,
    client: sqlite3.client,
    token: sqlite3.token
  };
} else {
  const mongodb = require('./oauth2-mongodb');
  module.exports = {
    oauth: mongodb.oauth,
    user: mongodb.user,
    client: mongodb.client,
    token: mongodb.token
  };
}
