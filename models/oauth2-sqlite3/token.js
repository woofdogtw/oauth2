/**
 * This module is used for managing access tokens and refresh tokens in
 * database, implemented with [SQLite3](http://www.sqlite.org/).
 *
 * @module model/sqlite3/Token
 */
'use strict';

// Node.js modules.
const crypto = require('crypto');

// 3rd party modules.
const randomstring = require('randomstring');

// Server modules.
const logger = require('../../lib/logger');

// Database connection.
const dbConn = require('./connection');

// Constants.
const LOG_MODNAME = '[oauth2-token-sqlite3]';
const TABLE = 'token';
const ERR_DB = Error('Invalid database');

// Create table and indexes.
function createTable() {
  const db = dbConn.connection;
  if (!db) {
    return;
  }

  const sqlTable = `CREATE TABLE IF NOT EXISTS ${TABLE} (` +
    'accessToken TEXT NOT NULL UNIQUE,' +
    'accessTokenExpiresAt INTEGER NOT NULL,' +
    'refreshToken TEXT,' +
    'refreshTokenExpiresAt INTEGER,' +
    'scope TEXT,' +
    'client TEXT NOT NULL,' +
    'user TEXT NOT NULL,' +
    'PRIMARY KEY (accessToken))';
  const sqlIndex = `CREATE INDEX IF NOT EXISTS ${TABLE}_refreshToken ` +
    `ON ${TABLE} (refreshToken)`;
  db.exec(sqlTable, (err) => {
    if (err) {
      return void logger.error(`${LOG_MODNAME} ${err.message}`);
    }
    db.exec(sqlIndex, (err) => {
      if (err) {
        return void logger.error(`${LOG_MODNAME} ${err.message}`);
      }
    });
  });
}
dbConn.on('connect', createTable);

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

  const sql = `DELETE FROM ${TABLE} WHERE accessToken=$accessToken`;
  const params = {
    $accessToken: accessToken
  };
  db.run(sql, params, (err) => {
    callback(err);
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

  const cond = 'accessToken=$accessToken';
  const fields = 'accessToken,accessTokenExpiresAt,scope,client,user';
  const sql = `SELECT ${fields} FROM ${TABLE} WHERE ${cond}`;
  const params = {
    $accessToken: accessToken,
  };
  db.get(sql, params, (err, row) => {
    if (err) {
      return void callback(err);
    } else if (!row) {
      return void callback(null, null);
    }
    row.accessTokenExpiresAt = new Date(row.accessTokenExpiresAt);
    if (!row.scope) {
      delete row.scope;
    }
    row.client = JSON.parse(row.client);
    row.user = JSON.parse(row.user);
    callback(null, row);
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

  const cond = 'refreshToken=$refreshToken';
  const fields = 'refreshToken,refreshTokenExpiresAt,scope,client,user';
  const sql = `SELECT ${fields} FROM ${TABLE} WHERE ${cond}`;
  const params = {
    $refreshToken: refreshToken,
  };
  db.get(sql, params, (err, row) => {
    if (err) {
      return void callback(err);
    } else if (!row) {
      return void callback(null, null);
    }
    row.refreshTokenExpiresAt = new Date(row.refreshTokenExpiresAt);
    if (!row.scope) {
      delete row.scope;
    }
    row.client = JSON.parse(row.client);
    row.user = JSON.parse(row.user);
    callback(null, row);
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

  const sql = `INSERT INTO ${TABLE} ` +
    '(accessToken,accessTokenExpiresAt,refreshToken,refreshTokenExpiresAt,' +
    'scope,client,user) VALUES ' +
    '($accessToken,$accessTokenExpiresAt,$refreshToken,' +
    '$refreshTokenExpiresAt,$scope,$client,$user)';
  const params = {
    $accessToken: token.accessToken,
    $accessTokenExpiresAt: token.accessTokenExpiresAt.getTime(),
    $refreshToken: token.refreshToken || null,
    $refreshTokenExpiresAt: token.refreshTokenExpiresAt ?
      token.refreshTokenExpiresAt.getTime() : null,
    $scope: token.scope || null,
    $client: JSON.stringify({ id: client.id }),
    $user: JSON.stringify({ userId: user.userId })
  };
  db.run(sql, params, (err) => {
    if (err) {
      return void callback(err);
    }
    callback(null, {
      accessToken: token.accessToken,
      accessTokenExpiresAt: token.accessTokenExpiresAt,
      refreshToken: token.refreshToken,
      refreshTokenExpiresAt: token.refreshTokenExpiresAt,
      scope: token.scope,
      client: { id: client.id },
      user: { userId: user.userId }
    });
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

  const sql = `DELETE FROM ${TABLE} WHERE refreshToken=$refreshToken`;
  const params = {
    $refreshToken: token.refreshToken
  };
  db.run(sql, params, (err) => {
    callback(null, !err);
  });
};
