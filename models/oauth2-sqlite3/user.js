/**
 * This module is used for managing users in database, implemented with
 * [SQLite3](http://www.sqlite.org/).
 *
 * @module model/sqlite3/User
 */
'use strict';

// Node.js modules.
const crypto = require('crypto');

// 3rd party modules.
const Joi          = require('joi');
const randomstring = require('randomstring');
const sqlite3      = require('sqlite3');

// Server modules.
const config = require('../../configs/oauth2');
const logger = require('../../lib/logger');

// Database connection.
const dbConn = require('./connection');

// Constants.
const LOG_MODNAME = '[oauth2-user-sqlite3]';
const TABLE = 'user';
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
    'userId TEXT NOT NULL UNIQUE,' +
    'email TEXT NOT NULL UNIQUE,' +
    'created INTEGER NOT NULL,' +
    'validated INTEGER,' +
    'expired INTEGER,' +
    'disabled INTEGER NOT NULL,' +
    'roles TEXT NOT NULL,' +
    'password TEXT NOT NULL,' +
    'salt TEXT NOT NULL,' +
    'name TEXT NOT NULL,' +
    'info TEXT NOT NULL,' +
    'PRIMARY KEY (userId))';
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
 * To get user list count.
 *
 * @param {Object} [opts] Options.
 *   @param {Object} [opts.cond] Conditions.
 *     @param {string} [opts.cond.email] To search the account of the specified
 *            E-mail address. This is case insensitive and excludes
 *            **contains**.
 *     @param {string} [opts.cond.contains] To search accounts that contains
 *            the specified word. Only \w are valid. This is case insensitive.
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 *   @param {number} callback.count User list count.
 */
module.exports.getUserCount = (opts, callback) => {
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
      if (c.email && (typeof(c.email) == 'string')) {
        params.$email = c.email.toLowerCase();
      }
      if (!c.email && c.contains && typeof(c.contains) === 'string') {
        params.$email =
          '%' + c.contains.toLowerCase().replace(/%/g, '\\%') + '%';
      }
    }
  }
  const sql = params.$email ?
    `SELECT COUNT(*) FROM ${TABLE} WHERE email LIKE $email` :
    `SELECT COUNT(*) FROM ${TABLE}`;
  db.get(sql, params, (err, row) => {
    if (err) {
      return void callback(err);
    }
    callback(null, row['COUNT(*)'] || 0);
  });
};

/**
 * To get user list.
 *
 * @param {Object} [opts] Options.
 *   @param {Object} [opts.cond] Conditions.
 *     @param {string} [opts.cond.email] To search the account of the specified
 *            E-mail address. This is case insensitive and excludes
 *            **contains**.
 *     @param {string} [opts.cond.contains] To search accounts that contains
 *            the specified word. Only \w are valid. This is case insensitive.
 *   @param {Object} [opts.fields] To hide or show fields.
 *     @param {boolean} [opts.fields.expired=false]
 *     @param {boolean} [opts.fields.disabled=false]
 *     @param {boolean} [opts.fields.roles=false]
 *   @param {number} [opts.skip=0] Number of data to skip.
 *   @param {number} [opts.limit=100] Maximum number of object to return.
 *   @param {Object[]} [opts.sort] Sort condition. Default is
 *          `[{key:'email',asc:true}]`.
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
 *   @param {module:model/Index~UserInfo[]} callback.list User list.
 *   @param {?Object} [callback.cursor] The cursor object that can be used to
 *          get more data. **null** means no more data.
 *     @param {function} callback.cursor.close To close the cursor.
 */
module.exports.getUserList = (opts, cursor, callback) => {
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
  let fields = [ 'userId', 'email', 'created', 'validated', 'name', 'info' ];
  let orderBy = 'email ASC';
  let offset = 0;
  let limit = 100;
  let cursorMax;
  if (opts && (typeof(opts) === 'object')) {
    const c = opts.cond;
    if (c && (typeof(c) === 'object')) {
      if (c.email && (typeof(c.email) == 'string')) {
        params.$email = c.email.toLowerCase();
      }
      if (!c.email && c.contains && typeof(c.contains) === 'string') {
        params.$email =
          '%' + c.contains.toLowerCase().replace(/%/g, '\\%') + '%';
      }
    }
    const f = opts.fields;
    if (f && (typeof(f) === 'object')) {
      if (f.expired === true) {
        fields.push('expired');
      }
      if (f.disabled === true) {
        fields.push('disabled');
      }
      if (f.roles === true) {
        fields.push('roles');
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

  const whereClause = params.$email ? 'WHERE email LIKE $email' : '';
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
      rowToUserInfo(row);
    }
    callback(null, rows);
  });
};

/**
 * To get a specified user information.
 *
 * @param {string} userId The specified user ID.
 * @param {Object} [opts] Options
 *   @param {Object} [opts.fields] To hide or show fields.
 *     @param {boolean} [opts.fields.expired=false]
 *     @param {boolean} [opts.fields.disabled=false]
 *     @param {boolean} [opts.fields.roles=false]
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 *   @param {?module:model/Index~UserInfo} callback.user
 */
module.exports.getUser = (userId, opts, callback) => {
  if (typeof(opts) === 'function') {
    callback = opts;
    opts = undefined;
  }

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

  let fields = [ 'userId', 'email', 'created', 'validated', 'name', 'info' ];
  if (opts && (typeof(opts) === 'object')) {
    const f = opts.fields;
    if (f && (typeof(f) === 'object')) {
      if (f.expired === true) {
        fields.push('expired');
      }
      if (f.disabled === true) {
        fields.push('disabled');
      }
      if (f.roles === true) {
        fields.push('roles');
      }
    }
  }

  const sql = `SELECT ${fields.toString()} FROM ${TABLE} WHERE userId=$userId`;
  const params = {
    $userId: userId
  };
  db.get(sql, params, (err, row) => {
    if (err) {
      return void callback(err);
    } else if (!row) {
      return void callback(null, null);
    }
    rowToUserInfo(row);
    callback(null, row);
  });
};

/**
 * To add a user.
 *
 * @param {Object} user The user object.
 *   @param {string} user.email The E-mail address.
 *   @param {Object.<string,boolean>} [user.roles={}] The roles.
 *   @param {string} user.password The password.
 *   @param {string} [user.name=''] The display name.
 *   @param {Object} [user.info={}] Other information.
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 *   @param {string} callback.userId The user ID.
 */
module.exports.addUser = (user, callback) => {
  const db = dbConn.connection;
  if (!db) {
    return void process.nextTick(() => { callback(ERR_DB); });
  }

  // Validate parameters.
  const result = Joi.validate(user, schema.add, JOI_OPTS);
  if (result.error) {
    return void process.nextTick(() => {
      callback(Error(`${result.error.name}: ${result.error.message}`));
    });
  }

  const salt = randomstring.generate(8);
  const now = Date.now();
  const sql = `INSERT INTO ${TABLE} (userId,email,created,validated,expired,` +
    'disabled,roles,password,salt,name,info) VALUES ($userId,$email,$created,' +
    '$validated,$expired,$disabled,$roles,$password,$salt,$name,$info)';
  const params = {
    $userId: `${now}-${randomstring.generate(8)}`,
    $email: user.email.toLocaleLowerCase(),
    $created: now,
    $validated: null,
    $expired: now + config.oauth2.userExpiredMsec,
    $disabled: 0,
    $roles: JSON.stringify(user.roles || {}),
    $password: getHash(user.password, salt),
    $salt: salt,
    $name: user.name || '',
    $info: JSON.stringify(user.info || {})
  };
  db.run(sql, params, (err) => {
    callback(err, params.$userId);
  });
};

/**
 * To remove a user.
 *
 * @param {string} userId The specified user ID.
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 */
module.exports.rmUser = (userId, callback) => {
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
 * To update user information.
 *
 * @param {string} userId The specified user ID.
 * @param {Object} updates The values to be updated.
 *   @param {Date} [updates.validated] Validation time.
 *   @param {null} [updates.expired] Expiration time.
 *   @param {boolean} [updates.disabled] `true` to enable or `false` to disable
 *          the user.
 *   @param {Object} [updates.roles] The roles.
 *   @param {string} [updates.password] The password.
 *   @param {string} [updates.name] The display name.
 *   @param {Object} [updates.info] Other information.
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 */
module.exports.updateUser = (userId, updates, callback) => {
  const db = dbConn.connection;
  if (!db) {
    return void process.nextTick(() => { callback(ERR_DB); });
  }

  // Validate parameters.
  let result = Joi.validate(userId, schema.id, JOI_OPTS);
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

  let params = { $userId: userId };
  let paramsList = [];
  for (let key in result.value) {
    const paramKey = `$${key}`;
    switch (key) {
    case 'validated':
      params.$validated = result.value.validated.getTime();
      break;
    case 'disabled':
      params.$disabled = result.value.disabled ? 1 : 0;
      break;
    case 'password':
    {
      const salt = randomstring.generate(8);
      params.$password = getHash(result.value.password, salt);
      params.$salt = salt;
      paramsList.push('salt=$salt');
      break;
    }
    case 'roles':
    case 'info':
      params[paramKey] = JSON.stringify(result.value[key]);
      break;
    default:
      params[paramKey] = result.value[key];
      break;
    }
    paramsList.push(`${key}=${paramKey}`);
  }
  const sql =
    `UPDATE ${TABLE} SET ${paramsList.toString()} WHERE userId=$userId`;
  db.run(sql, params, (err) => {
    callback(err);
  });
};

/**
 * The `oauth2-server` model implementation for `getUser()`.
 *
 * @param {string} username The username of the user to retrieve.
 * @param {string} password The user’s password.
 * @param {function} callback
 *   @param {?Error} callback.err DB error.
 *   @param {?Object} callback.user The return value.
 *     @param {string} callback.user.userId A unique string identifying the
 *            user.
 */
module.exports.getUserByNamePass = (username, password, callback) => {
  const db = dbConn.connection;
  if (!db) {
    return void process.nextTick(() => { callback(ERR_DB); });
  }

  const sql = `SELECT userId,password,salt FROM ${TABLE} ` +
    'WHERE email=$email AND disabled=0';
  const params = {
    $email: username.toLowerCase()
  };
  db.get(sql, params, (err, row) => {
    if (err) {
      return void callback(err);
    } else if (!row) {
      return void callback(null, null);
    }
    // Get password to support multiple comparing mechanisms.
    if (row.password !== getHash(password, row.salt)) {
      return void callback(null, null);
    }
    callback(null, { userId: row.userId });
  });
};

/**
 * To initialize schema for this module.
 *
 * @private
 * @memberof module:model/sqlite3/User
 */
function initSchema() {
  const opts = {
    allowUnknown: false,
    convert: false,
    stripUnknown: false
  };
  const pattern = /^[A-Za-z]+[A-Za-z0-9]*$/;

  schema.id = Joi.string().required();

  schema.add = Joi.object().keys({
    email: Joi.string().email().required(),
    roles: Joi.object().options(opts).pattern(pattern, Joi.boolean()),
    password: Joi.string().required(),
    name: Joi.string().allow(''),
    info: Joi.object()
  });

  schema.update = Joi.object().keys({
    validated: Joi.date(),
    expired: null,
    disabled: Joi.boolean(),
    roles: Joi.object().options(opts).pattern(pattern, Joi.boolean()),
    password: Joi.string(),
    name: Joi.string().allow(''),
    info: Joi.object()
  }).min(1);

  const re = /^(email|created|validated|expired|disabled|name)$/;
  schema.sort = Joi.array().items(Joi.object().keys({
    key: Joi.string().regex(re).required(),
    asc: Joi.boolean()
  }));
}

/**
 * To convert from SQLite row to `UserInfo` format.
 *
 * @private
 * @memberof module:model/sqlite3/User
 * @param {Object} row The original row data.
 */
function rowToUserInfo(row) {
  row.created = new Date(row.created);
  if (typeof(row.validated) === 'number') {
    row.validated = new Date(row.validated);
  }
  if (typeof(row.expired) === 'number') {
    row.expired = new Date(row.expired);
  }
  if (typeof(row.disabled) === 'number') {
    row.disabled = (row.disabled > 0);
  }
  if (typeof(row.roles) === 'string') {
    row.roles = JSON.parse(row.roles);
  }
  row.info = JSON.parse(row.info);
}

/**
 * To generate the hash value of a given string.
 *
 * @private
 * @memberof module:model/sqlite3/User
 * @param {string} str The string to generate hash value.
 * @param {string} salt Salt for hash.
 * @returns {string} The hash value.
 */
function getHash(str, salt) {
  return crypto.pbkdf2Sync(str, salt, 20, 64, 'sha256').toString('hex');
}
