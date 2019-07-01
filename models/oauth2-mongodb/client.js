/**
 * This module is used for managing clients in database, implemented with
 * [MongoDB](https://www.mongodb.com/).
 *
 * @module model/mongodb/Client
 */
'use strict';

// Node.js modules.
const crypto = require('crypto');

// 3rd party modules.
const Joi          = require('joi');
const mongodb      = require('mongodb');
const randomstring = require('randomstring');

// Database connection.
const dbConn = require('./connection');

// Constants.
const COLLECTION = 'client';
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
  col.createIndex({ id: 1 }, uniqueOpts);
  col.createIndex({ userId: 1, name: 1 }, opts);
}
dbConn.on('connect', createIndex);

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

  let query = {};
  if (opts && (typeof(opts) === 'object')) {
    const c = opts.cond;
    if (c && (typeof(c) === 'object')) {
      if (c.userId && typeof(c.userId) === 'string') {
        query.userId = c.userId;
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
    sort: [ [ 'userId', 1 ], [ 'name', 1 ] ],
    projection: {
      _id: 0, id: 1, created: 1, clientSecret: 1, redirectUris: 1, scopes: 1,
      grants: 1, name: 1, image: 1
    }
  };
  let cursorMax;
  if (opts && (typeof(opts) === 'object')) {
    const c = opts.cond;
    if (c && (typeof(c) === 'object')) {
      if (c.userId && typeof(c.userId) === 'string') {
        query.userId = c.userId;
      }
    }
    const f = opts.fields;
    if (f && (typeof(f) === 'object')) {
      if (f.userId === true) {
        _opts.projection.userId = 1;
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

  const query = { id: clientId };
  let _opts = {
    projection: {
      _id: 0, id: 1, created: 1, clientSecret: 1, redirectUris: 1, scopes: 1,
      grants: 1, name: 1, image: 1
    }
  };
  if (opts && (typeof(opts) === 'object')) {
    const f = opts.fields;
    if (f && (typeof(f) === 'object')) {
      if (f.userId === true) {
        _opts.projection.userId = 1;
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

  const now = new Date();
  const doc = {
    id: `${now.getTime()}-${randomstring.generate(8)}`,
    created: now,
    clientSecret:
      Buffer
        .from(getHash(`${now.getTime()}-${randomstring.generate(24)}`), 'hex')
        .toString('base64').replace(/=/g, ''),
    redirectUris: client.redirectUris,
    scopes: client.scopes || null,
    grants: client.grants,
    userId: client.userId,
    name: client.name || '',
    image: client.image || ''
  };
  db.collection(COLLECTION).insertOne(doc, (err, result) => {
    if (err) {
      return void callback(err);
    }
    callback(null, doc.id);
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

  const filter = { id: clientId };
  db.collection(COLLECTION).deleteOne(filter, (err, result) => {
    callback(err || null);
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

  const filter = { userId };
  db.collection(COLLECTION).deleteMany(filter, (err, result) => {
    callback(err || null);
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

  const filter = { id: clientId };
  let update = { $set: {} };
  for (let key in result.value) {
    update.$set[key] = result.value[key];
  }
  db.collection(COLLECTION).updateOne(filter, update, (err, result) => {
    callback(err || null);
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

  const query = clientSecret ?
    { id: clientId, clientSecret: clientSecret } : { id: clientId };
  const opts = {
    limit: 1,
    projection: { _id: 0, id: 1, redirectUris: 1, grants: 1 }
  };
  db.collection(COLLECTION).find(query, opts).next((err, result) => {
    if (err) {
      return void callback(err);
    } else if (!result) {
      return void callback(null, null);
    }
    if (!result.grants.includes('authorization_code')) {
      delete result.redirectUris;
    }
    callback(null, result);
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

  const query = { id: client.id };
  const opts = {
    limit: 1,
    projection: { _id: 0, userId: 1 }
  };
  db.collection(COLLECTION).find(query, opts).next((err, result) => {
    if (err) {
      return void callback(err);
    }
    callback(null, result || null);
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

  const query = { id: client.id };
  const opts = {
    limit: 1,
    projection: { _id: 0, scopes: 1 }
  };
  db.collection(COLLECTION).find(query, opts).next((err, result) => {
    if (err) {
      return void callback(err);
    } else if (!result || !result.scopes) {
      return void callback(null, null);
    }
    if (!scope.split(' ').every((s) => { return result.scopes.includes(s); })) {
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
 * @memberof module:model/mongodb/User
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
 * To generate the hash value of a given string.
 *
 * @private
 * @memberof module:model/mongodb/Client
 * @param {string} str The string to generate hash value.
 * @returns {string} The hash value.
 */
function getHash(str) {
  let hash = crypto.createHash('sha256');
  hash.update(str);
  return hash.digest('hex');
}
