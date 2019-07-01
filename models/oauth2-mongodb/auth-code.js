/**
 * This module is used for managing authorization codes in database, implemented
 * with [MongoDB](https://www.mongodb.com/).
 *
 * @module model/mongodb/AuthCode
 */
'use strict';

// Node.js modules.
const crypto = require('crypto');

// 3rd party modules.
const randomstring = require('randomstring');

// Database connection.
const dbConn = require('./connection');

// Constants.
const COLLECTION = 'authCode';
const ERR_DB = Error('Invalid database');

// Create indexes.
function createIndex() {
  const db = dbConn.connection;
  if (!db) {
    return;
  }

  const col = db.collection(COLLECTION);
  const uniqueOpts = { unique: true, background: true };
  col.createIndex({ code: 1 }, uniqueOpts);
}
dbConn.on('connect', createIndex);

/**
 * The `oauth2-server` model implementation for `generateAuthorizationCode()`.
 *
 * @param {Object} client The client the authorization code is generated for.
 * @param {Object} user The user the authorization code is generated for.
 * @param {?string} scope The scopes associated with the authorization code.
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 *   @param {string} callback.token The authorization code.
 */
module.exports.generateAuthorizationCode = (client, user, scope, callback) => {
  process.nextTick(() => {
    let hash = crypto.createHash('sha256');
    hash.update(`${Date.now()}-${randomstring.generate(8)}`);
    callback(null, hash.digest('hex'));
  });
};

/**
 * The `oauth2-server` model implementation for `getAuthorizationCode()`.
 *
 * @param {string} authorizationCode The authorization code to retrieve.
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 *   @param {?Object} callback.code The return value.
 *     @param {string} callback.code.code The access token.
 *     @param {Date} callback.code.expiresAt The expiry time of the
 *            authorization code.
 *     @param {string} [callback.code.redirectUri] The redirect URI of the
 *            authorization code.
 *     @param {string} [callback.code.scope] The authorized scope of the
 *            authorization code.
 *     @param {Object} callback.code.client The client associated with the
 *            authorization code.
 *       @param {string} callback.code.client.id A unique string identifying the
 *              client.
 *     @param {Object} callback.code.user The user associated with the
 *            authorization code.
 */
module.exports.getAuthorizationCode = (authorizationCode, callback) => {
  const db = dbConn.connection;
  if (!db) {
    return void process.nextTick(() => { callback(ERR_DB); });
  }

  const query = { code: authorizationCode };
  const opts = {
    limit: 1,
    projection: {
      _id: 0, code: 1, expiresAt: 1, redirectUri: 1, scope: 1, client: 1,
      user: 1
    }
  };
  db.collection(COLLECTION).find(query, opts).next((err, result) => {
    if (err) {
      return void callback(err);
    }
    callback(null, result || null);
  });
};

/**
 * The `oauth2-server` model implementation for `saveToken()`.
 *
 * @param {Object} code The code to be saved.
 *   @param {string} code.authorizationCode The authorization code to be saved.
 *   @param {Date} code.expiresAt The expiry time of the authorization code.
 *   @param {string} code.redirectUri The redirect URI associated with the
 *          authorization code.
 *   @param {string} [code.scope] The authorized scope of the authorization
 *          code.
 * @param {Object} client The client associated with the authorization code.
 *   @param {string} client.id A unique string identifying the client.
 * @param {Object} user The user associated with the authorization code.
 *   @param {string} user.userId A unique string identifying the user.
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 *   @param {Object} callback.code The return value.
 *     @param {string} callback.code.authorizationCode The authorization code
 *            passed to `saveAuthorizationCode()`.
 *     @param {Date} callback.code.expiresAt The expiry time of the
 *            authorization code.
 *     @param {string} callback.code.redirectUri The redirect URI associated
 *            with the authorization code.
 *     @param {string} [callback.code.scope] The authorized scope of the
 *            authorization code.
 *     @param {Object} callback.code.client The client associated with the
 *            authorization code.
 *       @param {string} callback.code.client.id A unique string identifying
 *              the client.
 *     @param {Object} callback.code.user The user associated with the
 *            authorization code.
 *       @param {string} callback.code.user.userId A unique string identifying
 *              the user.
 */
module.exports.saveAuthorizationCode = (code, client, user, callback) => {
  const db = dbConn.connection;
  if (!db) {
    return void process.nextTick(() => { callback(ERR_DB); });
  }

  let doc = {
    code: code.authorizationCode,
    expiresAt: code.expiresAt,
    redirectUri: code.redirectUri,
    client: { id: client.id },
    user: { userId: user.userId }
  };
  if ('scope' in code) {
    doc.scope = code.scope;
  }
  db.collection(COLLECTION).insertOne(doc, (err, result) => {
    if (err) {
      return void callback(err);
    }
    callback(null, {
      authorizationCode: doc.code,
      expiresAt: doc.expiresAt,
      redirectUri: doc.redirectUri,
      scope: doc.scope,
      client: doc.client,
      user: doc.user
    });
  });
};

/**
 * The `oauth2-server` model implementation for `revokeAuthorizationCode()`.
 *
 * @param {Object} code The token to be revoked.
 *   @param {string} code.code The authorization code.
 *   @param {Date} code.expiresAt The expiry time of the authorization code.
 *   @param {string} [code.redirectUri] The redirect URI of the authorization
 *          code.
 *   @param {string} [code.scope] The authorized scope of the authorization
 *          code.
 *   @param {Object} code.client The client associated with the authorization
 *          code.
 *     @param {string} code.client.id A unique string identifying the client.
 *   @param {Object} code.user The user associated with the authorization code.
 *     @param {string} token.user.userId A unique string identifying the user.
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 *   @param {boolean} callback.success The return value.
 */
module.exports.revokeAuthorizationCode = (code, callback) => {
  const db = dbConn.connection;
  if (!db) {
    return void process.nextTick(() => { callback(ERR_DB); });
  }

  const filter = { code: code.code };
  db.collection(COLLECTION).deleteOne(filter, (err, result) => {
    if (err) {
      return void callback(err, false);
    }
    callback(null, true);
  });
};
