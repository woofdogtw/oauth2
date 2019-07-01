/**
 * This module implements client administration APIs.
 *
 * @module routes/Client
 */
'use strict';

// 3rd party modules.
const Ajv   = require('ajv');
const async = require('async');

// Server modules.
const { error, errid } = require('../../lib/error');
const model = require('../../models/oauth2');

/**
 * Schema with `add`, `update`.
 */
let ajv = new Ajv({
  format: 'full',
  removeAdditional: 'all'
});
initSchema();

/**
 * `POST /api/client`
 *
 * Add a client.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
module.exports.postClient = (req, res, next) => {
  // Check parameters.
  if (!ajv.validate('add', req.body)) {
    return void next(error(errid.EPARAM, ajv.errorsText()));
  }
  if (!req.user.roles.admin || !req.body.userId) {
    req.body.userId = req.user.userId;
  }

  model.client.addClient(req.body, (err, clientId) => {
    if (err) {
      return void next(error(errid.EDB, err.message));
    }
    res.json({ clientId: clientId });
  });
};

/**
 * `GET /api/client/count`
 *
 * Get client count.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
module.exports.getClientCount = (req, res, next) => {
  // Parse parameters.
  const ret = parseCountParams(req.query, req.user);
  if (ret.err) {
    return void next(error(errid.EPARAM, ret.err));
  }

  model.client.getClientCount(ret.params, (err, count) => {
    if (err) {
      return void next(error(errid.EDB, err.message));
    }
    res.json({ count });
  });
};

/**
 * `GET /api/client/list`
 *
 * Get client list.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
module.exports.getClientList = (req, res, next) => {
  // Parse parameters.
  const ret = parseListParams(req.query, req.user);
  if (ret.err) {
    return void next(error(errid.EPARAM, ret.err));
  }

  model.client.getClientList(ret.params, (err, list, cursor) => {
    if (err) {
      return void next(error(errid.EDB, err.message));
    }
    res.json(list);
  });
};

/**
 * `GET /api/client/{clientId}`
 *
 * Get a client.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
module.exports.getClient = (req, res, next) => {
  const opts = { fields: { userId: true } };
  model.client.getClient(req.params.clientId, opts, (err, client) => {
    if (err) {
      return void next(error(errid.EDB, err.message));
    } else if (!client) {
      return void next(error(errid.ECLIENT_NOT_FOUND));
    }
    if (!req.user.roles.admin) {
      if (req.user.userId !== client.userId) {
        return void next(error(errid.ECLIENT_NOT_FOUND));
      }
      delete client.userId;
    }
    res.json(client);
  });
};

/**
 * `PUT /api/client/{clientId}`
 *
 * Update a client.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
module.exports.putClient = (req, res, next) => {
  // Check parameters.
  if (!ajv.validate('update', req.body)) {
    return void next(error(errid.EPARAM, ajv.errorsText()));
  } else if (Object.keys(req.body).length <= 0) {
    return void next(error(errid.EPARAM, 'At least one parameter'));
  }

  async.waterfall([
    // Check if the client is exising.
    function(cb) {
      const opts = { fields: { userId: true } };
      model.client.getClient(req.params.clientId, opts, (err, client) => {
        if (err) {
          return void cb(error(errid.EDB, err.message));
        } else if (!client ||
            (!req.user.roles.admin && (req.user.userId !== client.userId))) {
          return void cb(error(errid.ECLIENT_NOT_FOUND));
        }
        cb(null);
      });
    },
    // Update client information.
    function(cb) {
      model.client.updateClient(req.params.clientId, req.body, (err) => {
        cb(err ? error(errid.EDB, err.message) : null);
      });
    }
  ], (err) => {
    if (err) {
      return void next(err);
    }
    res.end();
  });
};

/**
 * `DELETE /api/client/{clientId}`
 *
 * Delete a client.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
module.exports.deleteClient = (req, res, next) => {
  async.waterfall([
    // Check if the client is exising.
    function(cb) {
      const opts = { fields: { userId: true } };
      model.client.getClient(req.params.clientId, opts, (err, client) => {
        if (err) {
          return void cb(error(errid.EDB, err.message));
        } else if (!client ||
            (!req.user.roles.admin && (req.user.userId !== client.userId))) {
          return void cb(error(errid.ECLIENT_NOT_FOUND));
        }
        cb(null);
      });
    },
    // Remove the client.
    function(cb) {
      model.client.rmClient(req.params.clientId, (err) => {
        cb(err ? error(errid.EDB, err.message) : null);
      });
    }
  ], (err) => {
    if (err) {
      return void next(err);
    }
    res.end();
  });
};

/**
 * `DELETE /api/client/user/{userId}`
 *
 * Delete clients of the specified user.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
module.exports.deleteClientUser = (req, res, next) => {
  async.waterfall([
    // Check if the user is exising.
    function(cb) {
      model.user.getUser(req.params.userId, (err, user) => {
        if (err) {
          return void cb(error(errid.EDB, err.message));
        } else if (!user) {
          return void cb(error(errid.EUSER_NOT_FOUND));
        }
        cb(null);
      });
    },
    // Remove clients.
    function(cb) {
      model.client.rmClientUser(req.params.userId, (err) => {
        cb(err ? error(errid.EDB, err.message) : null);
      });
    }
  ], (err) => {
    if (err) {
      return void next(err);
    }
    res.end();
  });
};

/**
 * To initialize schema for this module.
 *
 * @private
 * @memberof module:routes/Client
 */
function initSchema() {
  ajv.addSchema({
    type: 'object',
    properties: {
      redirectUris: {
        type: 'array',
        uniqueItems: true,
        items: { type: 'string', minLength: 1 }
      },
      scopes: {
        type: [ 'array', 'null' ],
        uniqueItems: true,
        items: { type: 'string', minLength: 1 }
      },
      grants: {
        type: 'array',
        uniqueItems: true,
        items: {
          type: 'string',
          minLength: 1,
          pattern:
            '^(authorization_code|password|client_credentials|refresh_token)$'
        }
      },
      userId: { type: 'string', minLength: 1 },
      name: { type: 'string' },
      image: { type: 'string' }
    },
    required: [ 'redirectUris', 'scopes', 'grants' ]
  }, 'add');

  ajv.addSchema({
    type: 'object',
    properties: {
      clientSecret: { type: 'string', minLength: 1 },
      redirectUris: {
        type: 'array',
        uniqueItems: true,
        items: { type: 'string', minLength: 1 }
      },
      scopes: {
        type: [ 'array', 'null' ],
        uniqueItems: true,
        items: { type: 'string', minLength: 1 }
      },
      name: { type: 'string' },
      image: { type: 'string' }
    },
    minProperties: 1
  }, 'update');
}

/**
 * To parse query string of `GET /api/client/count` and returns options for
 * `model.getClientCount()`.
 *
 * @private
 * @memberof module:routes/Client
 * @param {Object} qs The `req.query` object.
 * @param {Object} user The user information.
 *   @param {string} user.userId The user ID.
 *   @param {Object} user.roles Roles.
 * @returns {module:routes/Index~ParsedParams}
 */
function parseCountParams(qs, user) {
  let params = { cond: {} };

  if (!user.roles.admin) {
    params.cond.userId = user.userId;
  } else if (qs.user) {
    params.cond.userId = qs.user;
  }

  return { params };
}

/**
 * To parse query string of `GET /api/client/list` and returns options for
 * `model.getClientList()`.
 *
 * @private
 * @memberof module:routes/Client
 * @param {Object} qs The `req.query` object.
 * @param {Object} user The user information.
 *   @param {string} user.userId The user ID.
 *   @param {Object} user.roles Roles.
 * @returns {module:routes/Index~ParsedParams}
 */
function parseListParams(qs, user) {
  let ret = parseCountParams(JSON.parse(JSON.stringify(qs)), user);
  if (ret.err) {
    return ret;
  }
  let params = ret.params;

  let num = qs.num || '100';
  let p = qs.p || '1';
  if (/[^0-9]+/.test(num) || (parseInt(num) === 0)) {
    return { err: '`num` must be a positive number' };
  } else if (/[^0-9]+/.test(p)) {
    return { err: '`p` must be zero or a positive number' };
  }
  num = parseInt(num) || 100;
  p = parseInt(p) || 1;
  params.skip = ((p === 0) ? 0 : (p - 1) * num);
  params.limit = num;
  if (p === 0) {
    params.cursorMax = 100;
  }

  if (user.roles.admin) {
    params.fields = { userId: true };
  }

  return { params };
}
