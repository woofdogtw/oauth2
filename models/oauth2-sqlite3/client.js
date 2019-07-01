/**
 * This module is used for managing clients in database, implemented with
 * [SQLite3](http://www.sqlite.org/).
 *
 * @module model/sqlite3/Client
 */
'use strict';

// Node.js modules.
const crypto = require('crypto');

// 3rd party modules.
const Joi          = require('joi');
const randomstring = require('randomstring');
const sqlite3      = require('sqlite3');

// Server modules.
const logger = require('../../lib/logger');

// Database connection.
const dbConn = require('./connection');

// Constants.
const LOG_MODNAME = '[oauth2-client-sqlite3]';
const TABLE = 'client';
const ERR_DB = Error('Invalid database');
const JOI_OPTS = {
  allowUnknown: true,
  convert: false,
  stripUnknown: true
};

// Create table and indexes.
function createTable() {
  const db = dbConn.connection;
  if (!db) {
    return;
  }

  const sqlTable = `CREATE TABLE IF NOT EXISTS ${TABLE} (` +
    'id TEXT NOT NULL UNIQUE,' +
    'created INTEGER NOT NULL,' +
    'clientSecret TEXT NOT NULL,' +
    'redirectUris TEXT NOT NULL,' +
    'scopes TEXT,' +
    'grants TEXT NOT NULL,' +
    'userId TEXT NOT NULL,' +
    'name TEXT NOT NULL,' +
    'image TEXT NOT NULL,' +
    'PRIMARY KEY (id))';
  db.exec(sqlTable, (err) => {
    if (err) {
      return void logger.error(`${LOG_MODNAME} ${err.message}`);
    }
  });
}
dbConn.on('connect', createTable);

/**
 * Schema with `id`, `add`, `update`, `sort`.
 */
let schema = {};
initSchema();

/**
 * To get client list count.
 *
 * @param {Object} [opts] Options.
 *   @param {Object} [opts.cond] Conditions.
 *     @param {string} [opts.cond.userId] To search clients that is associated
 *            with the user ID.
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 *   @param {number} callback.count Client list count.
 */
module.exports.getClientCount = (opts, callback) => {
  if (typeof(opts) === 'function') {
    callback = opts;
    opts = undefined;
  }

  const db = dbConn.connection;
  if (!db) {
    return void process.nextTick(() => { callback(ERR_DB); });
  }

  let params = {};
  if (opts && (typeof(opts) === 'object')) {
    const c = opts.cond;
    if (c && (typeof(c) === 'object')) {
      if (c.userId && typeof(c.userId) === 'string') {
        params.$userId = c.userId;
      }
    }
  }
  const sql = params.$userId ?
    `SELECT COUNT(*) FROM ${TABLE} WHERE userId=$userId` :
    `SELECT COUNT(*) FROM ${TABLE}`;
  db.get(sql, params, (err, row) => {
    if (err) {
      return void callback(err);
    }
    callback(null, row['COUNT(*)'] || 0);
  });
};

/**
 * To get client list.
 *
 * @param {Object} [opts] Options.
 *   @param {Object} [opts.cond] Conditions.
 *     @param {string} [opts.cond.userId] To search clients that is associated
 *            with the user ID.
 *   @param {Object} [opts.fields] To hide or show fields.
 *     @param {boolean} [opts.fields.userId=false]
 *   @param {number} [opts.skip=0] Number of data to skip.
 *   @param {number} [opts.limit=100] Maximum number of object to return.
 *   @param {Object[]} [opts.sort] Sort condition. Default is
 *          `[{key:'userId',asc:true},{key:'name',asc:true}]`.
 *     @param {string} opts.sort.key Sort key.
 *     @param {boolean} [opts.sort.asc=true] Use ascending order.
 *   @param {number} [opts.cursorMax] To use cursor and assign maximum number of
 *          elements to get once. This must be provided when using cursors, or
 *          the **cursor** argument will be ignored.
 * @param {?Object} [cursor] To use cursor to get more data. This must be the
 *        cursor object received from the callback (use **null** for the first
 *        time).
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 *   @param {module:model/Index~ClientInfo[]} callback.list Client list.
 *   @param {?Object} [callback.cursor] The cursor object that can be used to
 *          get more data. **null** means no more data.
 *     @param {function} callback.cursor.close To close the cursor.
 */
module.exports.getClientList = (opts, cursor, callback) => {
  if (typeof(opts) === 'function') {
    callback = opts;
    opts = undefined;
    cursor = undefined;
  } else if (typeof(cursor) === 'function') {
    callback = cursor;
    if (opts instanceof sqlite3.Statement) {
      cursor = opts;
      opts = undefined;
    } else {
      cursor = undefined;
    }
  }

  const db = dbConn.connection;
  if (!db) {
    return void process.nextTick(() => { callback(ERR_DB); });
  }

  let params = {};
  let fields = [ 'id', 'created', 'clientSecret', 'redirectUris', 'scopes',
    'grants', 'name', 'image' ];
  let orderBy = 'userId ASC, name ASC';
  let offset = 0;
  let limit = 100;
  let cursorMax;
  if (opts && (typeof(opts) === 'object')) {
    const c = opts.cond;
    if (c && (typeof(c) === 'object')) {
      if (c.userId && typeof(c.userId) === 'string') {
        params.$userId = c.userId;
      }
    }
    const f = opts.fields;
    if (f && (typeof(f) === 'object')) {
      if (f.userId === true) {
        fields.push('userId');
      }
    }
    const s = opts.sort;
    if (s && !Joi.validate(s, schema.sort, JOI_OPTS).error) {
      let sortList = [];
      for (let sort of s) {
        sortList.push(sort.key + ((sort.asc === false) ? ' DESC' : ' ASC'));
      }
      if (sortList.length > 0) {
        orderBy = sortList.toString();
      }
    }
    if (Number.isInteger(opts.skip) && (opts.skip > 0)) {
      offset = opts.skip;
    }
    if (Number.isInteger(opts.limit) && (opts.limit > 0)) {
      limit = opts.limit;
    }
    if (Number.isInteger(opts.cursorMax) && (opts.cursorMax > 0)) {
      cursorMax = opts.cursorMax;
    }
  }

  const whereClause = params.$userId ? 'WHERE userId=$userId' : '';
  const sql = `SELECT ${fields.toString()} FROM ${TABLE} ${whereClause} ` +
    `ORDER BY ${orderBy.toString()} LIMIT ${limit} OFFSET ${offset}`;

  if (cursorMax) {
    return;
  }
  db.all(sql, params, (err, rows) => {
    if (err) {
      return void callback(err);
    }
    for (let row of rows) {
      rowToClientInfo(row);
    }
    callback(null, rows);
  });
};

/**
 * To get a specified client information.
 *
 * @param {string} clientId The specified client ID.
 * @param {Object} [opts] Options
 *   @param {Object} [opts.fields] To hide or show fields.
 *     @param {boolean} [opts.fields.userId=false]
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 *   @param {?module:model/Index~ClientInfo} callback.client
 */
module.exports.getClient = (clientId, opts, callback) => {
  if (typeof(opts) === 'function') {
    callback = opts;
    opts = undefined;
  }

  const db = dbConn.connection;
  if (!db) {
    return void process.nextTick(() => { callback(ERR_DB); });
  }

  // Validate parameters.
  const result = Joi.validate(clientId, schema.id, JOI_OPTS);
  if (result.error) {
    return void process.nextTick(() => {
      callback(Error(`${result.error.name}: ${result.error.message}`));
    });
  }

  let fields = [ 'id', 'created', 'clientSecret', 'redirectUris', 'scopes',
    'grants', 'name', 'image' ];
  if (opts && (typeof(opts) === 'object')) {
    const f = opts.fields;
    if (f && (typeof(f) === 'object')) {
      if (f.userId === true) {
        fields.push('userId');
      }
    }
  }

  const sql = `SELECT ${fields.toString()} FROM ${TABLE} WHERE id=$id`;
  const params = {
    $id: clientId
  };
  db.get(sql, params, (err, row) => {
    if (err) {
      return void callback(err);
    } else if (!row) {
      return void callback(null, null);
    }
    rowToClientInfo(row);
    callback(null, row);
  });
};

/**
 * To add a client.
 *
 * @param {Object} client The client object.
 *   @param {string[]} client.redirectUris Allowed redirect URIs.
 *   @param {?string[]} client.scopes Allowed scopes.
 *   @param {string[]} client.grants Allowed grant types.
 *   @param {string} client.userId Developer's user ID.
 *   @param {string} [client.name=''] Client name.
 *   @param {string} [client.image=''] Image URL.
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 *   @param {string} callback.clientId The client ID.
 */
module.exports.addClient = (client, callback) => {
  const db = dbConn.connection;
  if (!db) {
    return void process.nextTick(() => { callback(ERR_DB); });
  }

  // Validate parameters.
  const result = Joi.validate(client, schema.add, JOI_OPTS);
  if (result.error) {
    return void process.nextTick(() => {
      callback(Error(`${result.error.name}: ${result.error.message}`));
    });
  }

  const now = Date.now();
  const sql = `INSERT INTO ${TABLE} ` + '(id,created,clientSecret,' +
    'redirectUris,scopes,grants,userId,name,image) VALUES ($id,$created,' +
    '$clientSecret,$redirectUris,$scopes,$grants,$userId,$name,$image)';
  const params = {
    $id: `${now}-${randomstring.generate(8)}`,
    $created: now,
    $clientSecret:
      Buffer.from(getHash(`${now}-${randomstring.generate(24)}`), 'hex')
        .toString('base64').replace(/=/g, ''),
    $redirectUris: JSON.stringify(client.redirectUris),
    $scopes: (client.scopes ? JSON.stringify(client.scopes) : null),
    $grants: JSON.stringify(client.grants),
    $userId: client.userId,
    $name: client.name || '',
    $image: client.image || ''
  };
  db.run(sql, params, (err) => {
    callback(err, params.$id);
  });
};

/**
 * To remove a client.
 *
 * @param {string} clientId The specified client ID.
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 */
module.exports.rmClient = (clientId, callback) => {
  const db = dbConn.connection;
  if (!db) {
    return void process.nextTick(() => { callback(ERR_DB); });
  }

  // Validate parameters.
  const result = Joi.validate(clientId, schema.id, JOI_OPTS);
  if (result.error) {
    return void process.nextTick(() => {
      callback(Error(`${result.error.name}: ${result.error.message}`));
    });
  }

  const sql = `DELETE FROM ${TABLE} WHERE id=$id`;
  const params = {
    $id: clientId
  };
  db.run(sql, params, (err) => {
    callback(err);
  });
};

/**
 * To remove clients of the specified user.
 *
 * @param {string} userId The specified user ID.
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 */
module.exports.rmClientUser = (userId, callback) => {
  const db = dbConn.connection;
  if (!db) {
    return void process.nextTick(() => { callback(ERR_DB); });
  }

  // Validate parameters.
  const result = Joi.validate(userId, schema.id, JOI_OPTS);
  if (result.error) {
    return void process.nextTick(() => {
      callback(Error(`${result.error.name}: ${result.error.message}`));
    });
  }

  const sql = `DELETE FROM ${TABLE} WHERE userId=$userId`;
  const params = {
    $userId: userId
  };
  db.run(sql, params, (err) => {
    callback(err);
  });
};

/**
 * To update client information.
 *
 * @param {string} clientId The specified client ID.
 * @param {Object} updates The values to be updated.
 *   @param {string} [updates.clientSecret] Client secret.
 *   @param {string[]} [updates.redirectUris] Allowed redirect URIs.
 *   @param {?string[]} [updates.scopes] Allowed scopes.
 *   @param {string} [updates.name] Client name.
 *   @param {string} [updates.image] Image URL.
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 */
module.exports.updateClient = (clientId, updates, callback) => {
  const db = dbConn.connection;
  if (!db) {
    return void process.nextTick(() => { callback(ERR_DB); });
  }

  // Validate parameters.
  let result = Joi.validate(clientId, schema.id, JOI_OPTS);
  if (result.error) {
    return void process.nextTick(() => {
      callback(Error(`${result.error.name}: ${result.error.message}`));
    });
  }
  result = Joi.validate(updates, schema.update, JOI_OPTS);
  if (result.error) {
    return void process.nextTick(() => {
      callback(Error(`${result.error.name}: ${result.error.message}`));
    });
  }

  let params = { $id: clientId };
  let paramsList = [];
  for (let key in result.value) {
    const paramKey = `$${key}`;
    switch (key) {
    case 'redirectUris':
      params.$redirectUris = JSON.stringify(result.value.redirectUris);
      break;
    case 'scopes':
      params.$scopes = result.value.scopes ?
        JSON.stringify(result.value.scopes) : null;
      break;
    default:
      params[paramKey] = result.value[key];
      break;
    }
    paramsList.push(`${key}=${paramKey}`);
  }
  const sql =
    `UPDATE ${TABLE} SET ${paramsList.toString()} WHERE id=$id`;
  db.run(sql, params, (err) => {
    callback(err);
  });
};

/**
 * The `oauth2-server` model implementation for `getClient()`.
 *
 * @param {string} clientId The client id of the client to retrieve.
 * @param {?string} clientSecret The client secret of the client to retrieve.
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 *   @param {?Object} callback.client The return value.
 *     @param {string} callback.client.id A unique string identifying the
 *            client.
 *     @param {string[]} [callback.client.redirectUris] Redirect URIs allowed
 *            for the client. Required for the `authorization_code` grant.
 *     @param {string[]} callback.client.grants Grant types allowed for the
 *            client.
 */
module.exports.getClientByIdSecret = (clientId, clientSecret, callback) => {
  const db = dbConn.connection;
  if (!db) {
    return void process.nextTick(() => { callback(ERR_DB); });
  }

  const cond = clientSecret ? '(id=$id AND clientSecret=$secret)' : 'id=$id';
  const fields = 'id,redirectUris,grants';
  const sql = `SELECT ${fields} FROM ${TABLE} WHERE ${cond}`;
  const params = {
    $id: clientId,
    $secret: clientSecret || undefined
  };
  db.get(sql, params, (err, row) => {
    if (err) {
      return void callback(err);
    } else if (!row) {
      return void callback(null, null);
    }
    row.grants = JSON.parse(row.grants);
    if (!row.grants.includes('authorization_code')) {
      delete row.redirectUris;
    } else {
      row.redirectUris = JSON.parse(row.redirectUris);
    }
    callback(null, row);
  });
};

/**
 * The `oauth2-server` model implementation for `getUserFromClient()`.
 *
 * @param {Object} client The client to retrieve the associated user for.
 *   @param {string} client.id A unique string identifying the client.
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 *   @param {?Object} callback.user The return value.
 *     @param {string} callback.user.userId A unique string identifying the
 *            user.
 */
module.exports.getUserFromClient = (client, callback) => {
  const db = dbConn.connection;
  if (!db) {
    return void process.nextTick(() => { callback(ERR_DB); });
  }

  const sql = `SELECT userId FROM ${TABLE} WHERE id=$id`;
  const params = {
    $id: client.id
  };
  db.get(sql, params, (err, row) => {
    callback(err || null, row || null);
  });
};

/**
 * The `oauth2-server` model implementation for `validateScope()`.
 *
 * @param {Object} user The associated user.
 *   @param {string} user.userId A unique string identifying the user.
 * @param {Object} client The associated client.
 *   @param {string} client.id A unique string identifying the client.
 * @param {string} scope The scopes to validate.
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 *   @param {?string} callback.scope Validated scopes to be used.
 */
module.exports.validateScope = (user, client, scope, callback) => {
  const db = dbConn.connection;
  if (!db) {
    return void process.nextTick(() => { callback(ERR_DB); });
  } else if (!scope) {
    return void process.nextTick(() => { callback(null, null); });
  }

  const sql = `SELECT scopes FROM ${TABLE} WHERE id=$id`;
  const params = {
    $id: client.id
  };
  db.get(sql, params, (err, row) => {
    if (err) {
      return void callback(err);
    } else if (!row || !row.scopes) {
      return void callback(null, null);
    }
    const scopes = JSON.parse(row.scopes);
    if (!scope.split(' ').every((s) => { return scopes.includes(s); })) {
      return void callback(null, null);
    }
    callback(null, scope);
  });
};

/**
 * The `oauth2-server` model implementation for `verifyScope()`.
 *
 * @param {Object} token The access token to test against.
 *   @param {string} token.accessToken The access token.
 *   @param {Date} [token.accessTokenExpiresAt] The expiry time of the access
 *          token.
 *   @param {string} [token.scope] The authorized scope of the access token.
 *   @param {Object} token.client The client associated with the access token.
 *     @param {string} token.client.id A unique string identifying the client.
 *   @param {Object} token.user The user associated with the access token.
 * @param {string} scope The required scopes.
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 *   @param {boolean} callback.success The return value.
 */
module.exports.verifyScope = (token, scope, callback) => {
  process.nextTick(() => {
    if (!token.scope) {
      return void callback(null, false);
    }
    const reqScopes = scope.split(' ');
    const authScopes = token.scope.split(' ');
    callback(null, reqScopes.every((s) => { return authScopes.includes(s); }));
  });
};

/**
 * To initialize schema for this module.
 *
 * @private
 * @memberof module:model/sqlite3/User
 */
function initSchema() {
  schema.id = Joi.string().required();

  const grantsRe =
    /^(authorization_code|password|client_credentials|refresh_token)$/;
  schema.add = Joi.object().keys({
    redirectUris: Joi.array().items(Joi.string()).required(),
    scopes: Joi.array().items(Joi.string()).allow(null).required(),
    grants: Joi.array().items(Joi.string().regex(grantsRe)).required(),
    userId: Joi.string().required(),
    name: Joi.string().allow(''),
    image: Joi.string().allow('')
  });

  schema.update = Joi.object().keys({
    clientSecret: Joi.string(),
    redirectUris: Joi.array().items(Joi.string()),
    scopes: Joi.array().items(Joi.string()).allow(null),
    name: Joi.string().allow(''),
    image: Joi.string().allow('')
  }).min(1);

  const re = /^(created|userId|name)$/;
  schema.sort = Joi.array().items(Joi.object().keys({
    key: Joi.string().regex(re).required(),
    asc: Joi.boolean()
  }));
}

/**
 * To convert from SQLite row to `ClientInfo` format.
 *
 * @private
 * @memberof module:model/sqlite3/Client
 * @param {Object} row The original row data.
 */
function rowToClientInfo(row) {
  row.created = new Date(row.created);
  if (typeof(row.redirectUris) === 'string') {
    row.redirectUris = JSON.parse(row.redirectUris);
  }
  if (typeof(row.scopes) === 'string') {
    row.scopes = JSON.parse(row.scopes);
  }
  if (typeof(row.grants) === 'string') {
    row.grants = JSON.parse(row.grants);
  }
}

/**
 * To generate the hash value of a given string.
 *
 * @private
 * @memberof module:model/sqlite3/Client
 * @param {string} str The string to generate hash value.
 * @returns {string} The hash value.
 */
function getHash(str) {
  let hash = crypto.createHash('sha256');
  hash.update(str);
  return hash.digest('hex');
}
