/**
 * This module is used for managing users in database, implemented with
 * [MongoDB](https://www.mongodb.com/).
 *
 * @module model/mongodb/User
 */
'use strict';

// Node.js modules.
const crypto = require('crypto');

// 3rd party modules.
const escapeRegexp = require('escape-string-regexp');
const Joi          = require('joi');
const mongodb      = require('mongodb');
const randomstring = require('randomstring');

// Server modules.
const config = require('../../configs/oauth2');

// Database connection.
const dbConn = require('./connection');

// Constants.
const COLLECTION = 'user';
const ERR_DB = Error('Invalid database');
const JOI_OPTS = {
  allowUnknown: true,
  convert: false,
  stripUnknown: true
};

// Create indexes.
function createIndex() {
  const db = dbConn.connection;
  if (!db) {
    return;
  }

  const col = db.collection(COLLECTION);
  const opts = { background: true };
  const uniqueOpts = { unique: true, background: true };
  col.createIndex({ userId: 1 }, uniqueOpts);
  col.createIndex({ email: 1 }, uniqueOpts);
  col.createIndex({ created: 1 }, opts);
  col.createIndex({ validated: 1 }, opts);
  col.createIndex({ expired: 1 }, opts);
  col.createIndex({ disabled: 1 }, opts);
}
dbConn.on('connect', createIndex);

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

  let query = {};
  if (opts && (typeof(opts) === 'object')) {
    const c = opts.cond;
    if (c && (typeof(c) === 'object')) {
      if (c.email && (typeof(c.email) == 'string')) {
        query.email = c.email.toLowerCase();
      }
      if (!c.email && c.contains && typeof(c.contains) === 'string') {
        query.email = new RegExp(escapeRegexp(c.contains), 'i');
      }
    }
  }
  db.collection(COLLECTION).countDocuments(query, (err, result) => {
    if (err) {
      return void callback(err);
    }
    callback(null, result);
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
    if (opts instanceof mongodb.Cursor) {
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

  let query = {};
  let _opts = {
    sort: [ [ 'email', 1 ] ],
    projection: {
      _id: 0, userId: 1, email: 1, created: 1, validated: 1, name: 1, info: 1
    }
  };
  let cursorMax;
  if (opts && (typeof(opts) === 'object')) {
    const c = opts.cond;
    if (c && (typeof(c) === 'object')) {
      if (c.email && (typeof(c.email) == 'string')) {
        query.email = c.email.toLowerCase();
      }
      if (!c.email && c.contains && typeof(c.contains) === 'string') {
        query.email = new RegExp(escapeRegexp(c.contains), 'i');
      }
    }
    const f = opts.fields;
    if (f && (typeof(f) === 'object')) {
      if (f.expired === true) {
        _opts.projection.expired = 1;
      }
      if (f.disabled === true) {
        _opts.projection.disabled = 1;
      }
      if (f.roles === true) {
        _opts.projection.roles = 1;
      }
    }
    const s = opts.sort;
    if (s && !Joi.validate(s, schema.sort, JOI_OPTS).error) {
      let sortList = [];
      for (let sort of s) {
        sortList.push([ sort.key, ((sort.asc === false) ? -1 : 1) ]);
      }
      if (sortList.length > 0) {
        _opts.sort = sortList;
      }
    }
    if (Number.isInteger(opts.skip) && (opts.skip > 0)) {
      _opts.skip = opts.skip;
    }
    if (Number.isInteger(opts.limit) && (opts.limit > 0)) {
      _opts.limit = opts.limit;
    }
    if (Number.isInteger(opts.cursorMax) && (opts.cursorMax > 0)) {
      cursorMax = opts.cursorMax;
    }
  }

  if (!(cursor && (cursor instanceof mongodb.Cursor))) {
    cursor = db.collection(COLLECTION).find(query, _opts);
  }

  if (cursorMax) {
    return;
  }
  cursor.toArray((err, documents) => {
    if (err) {
      return void callback(err);
    }
    callback(null, documents || []);
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

  const query = { userId };
  let _opts = {
    projection: {
      _id: 0, userId: 1, email: 1, created: 1, validated: 1, name: 1, info: 1
    }
  };
  if (opts && (typeof(opts) === 'object')) {
    const f = opts.fields;
    if (f && (typeof(f) === 'object')) {
      if (f.expired === true) {
        _opts.projection.expired = 1;
      }
      if (f.disabled === true) {
        _opts.projection.disabled = 1;
      }
      if (f.roles === true) {
        _opts.projection.roles = 1;
      }
    }
  }
  db.collection(COLLECTION).find(query, _opts).next((err, result) => {
    if (err) {
      return void callback(err);
    }
    callback(null, result || null);
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
  const now = new Date();
  const doc = {
    userId: `${now.getTime()}-${randomstring.generate(8)}`,
    email: user.email.toLocaleLowerCase(),
    created: now,
    validated: null,
    expired: new Date(now.getTime() + config.oauth2.userExpiredMsec),
    disabled: false,
    roles: user.roles || {},
    password: getHash(user.password, salt),
    salt: salt,
    name: user.name || '',
    info: user.info || {}
  };
  db.collection(COLLECTION).insertOne(doc, (err, result) => {
    if (err) {
      return void callback(err);
    }
    callback(null, doc.userId);
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

  const filter = { userId };
  db.collection(COLLECTION).deleteOne(filter, (err, result) => {
    callback(err || null);
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

  const filter = { userId };
  let update = { $set: {} };
  for (let key in result.value) {
    if (key === 'password') {
      const salt = randomstring.generate(8);
      update.$set.password = getHash(result.value.password, salt);
      update.$set.salt = salt;
      continue;
    }
    update.$set[key] = result.value[key];
  }
  db.collection(COLLECTION).updateOne(filter, update, (err, result) => {
    callback(err || null);
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

  const query = { email: username.toLowerCase(), disabled: false };
  const opts = {
    limit: 1,
    projection: { _id: 0, userId: 1, password: 1, salt: 1 }
  };
  db.collection(COLLECTION).find(query, opts).next((err, result) => {
    if (err) {
      return void callback(err);
    } else if (!result) {
      return void callback(null, null);
    }
    // Get password to support multiple comparing mechanisms.
    if (result.password !== getHash(password, result.salt)) {
      return void callback(null, null);
    }
    callback(null, { userId: result.userId });
  });
};

/**
 * To initialize schema for this module.
 *
 * @private
 * @memberof module:model/mongodb/User
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
 * To generate the hash value of a given string.
 *
 * @private
 * @memberof module:model/mongodb/User
 * @param {string} str The string to generate hash value.
 * @param {string} salt Salt for hash.
 * @returns {string} The hash value.
 */
function getHash(str, salt) {
  return crypto.pbkdf2Sync(str, salt, 20, 64, 'sha256').toString('hex');
}
