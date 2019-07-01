/**
 * This module is used for managing authorization codes in database, implemented
 * with [SQLite3](http://www.sqlite.org/).
 *
 * @module model/sqlite3/AuthCode
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
const LOG_MODNAME = '[oauth2-auth-code-sqlite3]';
const TABLE = 'authCode';
const ERR_DB = Error('Invalid database');

// Create table and indexes.
function createTable() {
  const db = dbConn.connection;
  if (!db) {
    return;
  }

  const sqlTable = `CREATE TABLE IF NOT EXISTS ${TABLE} (` +
    'code TEXT NOT NULL UNIQUE,' +
    'expiresAt INTEGER NOT NULL,' +
    'redirectUri TEXT,' +
    'scope TEXT,' +
    'client TEXT NOT NULL,' +
    'user TEXT NOT NULL,' +
    'PRIMARY KEY (code))';
  db.exec(sqlTable, (err) => {
    if (err) {
      return void logger.error(`${LOG_MODNAME} ${err.message}`);
    }
  });
}
dbConn.on('connect', createTable);

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

  const cond = 'code=$code';
  const fields = 'code,expiresAt,redirectUri,scope,client,user';
  const sql = `SELECT ${fields} FROM ${TABLE} WHERE ${cond}`;
  const params = {
    $code: authorizationCode,
  };
  db.get(sql, params, (err, row) => {
    if (err) {
      return void callback(err);
    } else if (!row) {
      return void callback(null, null);
    }
    row.expiresAt = new Date(row.expiresAt);
    if (!row.redirectUri) {
      delete row.redirectUri;
    }
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

  const sql = `INSERT INTO ${TABLE} ` +
    '(code,expiresAt,redirectUri,scope,client,user) VALUES ' +
    '($code,$expiresAt,$redirectUri,$scope,$client,$user)';
  const params = {
    $code: code.authorizationCode,
    $expiresAt: code.expiresAt.getTime(),
    $redirectUri: code.redirectUri,
    $scope: code.scope || null,
    $client: JSON.stringify({ id: client.id }),
    $user: JSON.stringify({ userId: user.userId })
  };
  db.run(sql, params, (err) => {
    if (err) {
      return void callback(err);
    }
    callback(null, {
      authorizationCode: code.authorizationCode,
      expiresAt: code.expiresAt,
      redirectUri: code.redirectUri,
      scope: code.scope,
      client: { id: client.id },
      user: { userId: user.userId }
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

  const sql = `DELETE FROM ${TABLE} WHERE code=$code`;
  const params = {
    $code: code.code
  };
  db.run(sql, params, (err) => {
    callback(null, !err);
  });
};
