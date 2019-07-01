/**
 * This module is used for managing access tokens and refresh tokens in
 * database, implemented with [MongoDB](https://www.mongodb.com/).
 *
 * @module model/mongodb/Token
 */
'use strict';

// Node.js modules.
const crypto = require('crypto');

// 3rd party modules.
const randomstring = require('randomstring');

// Database connection.
const dbConn = require('./connection');

// Constants.
const COLLECTION = 'token';
const ERR_DB = Error('Invalid database');

// Create indexes.
function createIndex() {
  const db = dbConn.connection;
  if (!db) {
    return;
  }

  const col = db.collection(COLLECTION);
  const uniqueOpts = { unique: true, background: true };
  col.createIndex({ accessToken: 1 }, uniqueOpts);
  col.createIndex({ refreshToken: 1 }, uniqueOpts);
}
dbConn.on('connect', createIndex);

/**
 * Remove the access token.
 *
 * @param {string} accessToken The access token to be removed.
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 */
module.exports.rmAccessToken = (accessToken, callback) => {
  const db = dbConn.connection;
  if (!db) {
    return void process.nextTick(() => { callback(ERR_DB); });
  }

  const filter = { accessToken };
  db.collection(COLLECTION).deleteOne(filter, (err, result) => {
    if (err) {
      return void callback(err);
    }
    callback(null);
  });
};

/**
 * The `oauth2-server` model implementation for `generateAccessToken()`.
 *
 * @param {Object} client The client the access token is generated for.
 * @param {Object} user The user the access token is generated for.
 * @param {?string} scope The scopes associated with the access token.
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 *   @param {string} callback.token The access token.
 */
module.exports.generateAccessToken = (client, user, scope, callback) => {
  process.nextTick(() => {
    let hash = crypto.createHash('sha256');
    hash.update(`${Date.now()}-${randomstring.generate(8)}`);
    callback(null, hash.digest('hex'));
  });
};

/**
 * The `oauth2-server` model implementation for `generateRefreshToken()`.
 *
 * @param {Object} client The client the refresh token is generated for.
 * @param {Object} user The user the refresh token is generated for.
 * @param {?string} scope The scopes associated with the refresh token.
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 *   @param {string} callback.token The refresh token.
 */
module.exports.generateRefreshToken = (client, user, scope, callback) => {
  module.exports.generateAccessToken(client, user, scope, callback);
};

/**
 * The `oauth2-server` model implementation for `getAccessToken()`.
 *
 * @param {string} accessToken The access token to retrieve.
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 *   @param {?Object} callback.token The return value.
 *     @param {string} callback.token.accessToken The access token.
 *     @param {Date} callback.token.accessTokenExpiresAt The expiry time of the
 *            access token.
 *     @param {string} [callback.token.scope] The authorized scope of the access
 *            token.
 *     @param {Object} callback.token.client The client associated with the
 *            access token.
 *       @param {string} callback.token.client.id A unique string identifying
 *              the client.
 *     @param {Object} callback.token.user The user associated with the access
 *            token.
 *       @param {string} callback.token.user.userId A unique string identifying
 *              the user.
 */
module.exports.getAccessToken = (accessToken, callback) => {
  const db = dbConn.connection;
  if (!db) {
    return void process.nextTick(() => { callback(ERR_DB); });
  }

  const query = { accessToken };
  const opts = {
    limit: 1,
    projection: {
      _id: 0, accessToken: 1, accessTokenExpiresAt: 1, scope: 1, client: 1,
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
 * The `oauth2-server` model implementation for `getRefreshToken()`.
 *
 * @param {string} refreshToken The refresh token to retrieve.
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 *   @param {?Object} callback.token The return value.
 *     @param {string} callback.token.refreshToken The refresh token.
 *     @param {Date} callback.token.refreshTokenExpiresAt The expiry time of the
 *            refresh token.
 *     @param {string} [callback.token.scope] The authorized scope of the
 *            refresh token.
 *     @param {Object} callback.token.client The client associated with the
 *            refresh token.
 *       @param {string} callback.token.client.id A unique string identifying
 *              the client.
 *     @param {Object} callback.token.user The user associated with the refresh
 *            token.
 *       @param {string} callback.token.user.userId A unique string identifying
 *              the user.
 */
module.exports.getRefreshToken = (refreshToken, callback) => {
  const db = dbConn.connection;
  if (!db) {
    return void process.nextTick(() => { callback(ERR_DB); });
  }

  const query = { refreshToken };
  const opts = {
    limit: 1,
    projection: {
      _id: 0, refreshToken: 1, refreshTokenExpiresAt: 1, scope: 1, client: 1,
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
 * @param {Object} token The token(s) to be saved.
 *   @param {string} token.accessToken The access token to be saved.
 *   @param {Date} token.accessTokenExpiresAt The expiry time of the access
 *          token.
 *   @param {string} [token.refreshToken] The refresh token to be saved.
 *   @param {Date} [token.refreshTokenExpiresAt] The expiry time of the refresh
 *          token.
 *   @param {string} [token.scope] The authorized scope of the token(s).
 * @param {Object} client The client associated with the token(s).
 *   @param {string} client.id A unique string identifying the client.
 * @param {Object} user The user associated with the token(s).
 *   @param {string} user.userId A unique string identifying the user.
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 *   @param {Object} callback.token The return value.
 *     @param {string} callback.token.accessToken The access token passed to
 *            `saveToken()`.
 *     @param {Date} callback.token.accessTokenExpiresAt The expiry time of the
 *            access token.
 *     @param {string} [callback.token.refreshToken] The refresh token passed to
 *            `saveToken()`.
 *     @param {Date} [callback.token.refreshTokenExpiresAt] The expiry time of
 *            the refresh token.
 *     @param {string} [callback.token.scope] The authorized scope of the access
 *            token.
 *     @param {Object} callback.token.client The client associated with the
 *            access token.
 *       @param {string} callback.token.client.id A unique string identifying
 *              the client.
 *     @param {Object} callback.token.user The user associated with the access
 *            token.
 *       @param {string} callback.token.user.userId A unique string identifying
 *              the user.
 */
module.exports.saveToken = (token, client, user, callback) => {
  const db = dbConn.connection;
  if (!db) {
    return void process.nextTick(() => { callback(ERR_DB); });
  }

  let doc = {
    accessToken: token.accessToken,
    accessTokenExpiresAt: token.accessTokenExpiresAt,
    client: { id: client.id },
    user: { userId: user.userId }
  };
  if ('refreshToken' in token) {
    doc.refreshToken = token.refreshToken;
  }
  if ('refreshTokenExpiresAt' in token) {
    doc.refreshTokenExpiresAt = token.refreshTokenExpiresAt;
  }
  if ('scope' in token) {
    doc.scope = token.scope;
  }
  db.collection(COLLECTION).insertOne(doc, (err, result) => {
    if (err) {
      return void callback(err);
    }
    callback(null, doc);
  });
};

/**
 * The `oauth2-server` model implementation for `revokeToken()`.
 *
 * @param {Object} token The token to be revoked.
 *   @param {string} token.refreshToken The refresh token.
 *   @param {Date} [token.refreshTokenExpiresAt] The expiry time of the refresh
 *          token.
 *   @param {string} [token.scope] The authorized scope of the refresh token.
 *   @param {Object} token.client The client associated with the refresh token.
 *     @param {string} token.client.id A unique string identifying the client.
 *   @param {Object} token.user The user associated with the refresh token.
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 *   @param {boolean} callback.success The return value.
 */
module.exports.revokeToken = (token, callback) => {
  const db = dbConn.connection;
  if (!db) {
    return void process.nextTick(() => { callback(ERR_DB); });
  }

  const filter = { refreshToken: token.refreshToken };
  db.collection(COLLECTION).deleteOne(filter, (err, result) => {
    if (err) {
      return void callback(err, false);
    }
    callback(null, true);
  });
};
