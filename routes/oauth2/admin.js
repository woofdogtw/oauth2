/**
 * This module implements user administration APIs.
 *
 * @module routes/Admin
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
 * `POST /api/user`
 *
 * Add a user.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
module.exports.postUser = (req, res, next) => {
  // Check parameters.
  if (!ajv.validate('add', req.body)) {
    return void next(error(errid.EPARAM, ajv.errorsText()));
  }

  async.waterfall([
    // Check if the user is exising.
    function(cb) {
      const opts = {
        cond: { contains: req.body.email },
        limit: 1
      };
      model.user.getUserList(opts, (err, list) => {
        if (err) {
          return void cb(error(errid.EDB, err.message));
        } else if (!list || (list.length <= 0) ||
            (list[0].email !== req.body.email.toLowerCase())) {
          return void cb(null);
        }
        cb(error(errid.EUSER_EXISTS));
      });
    },
    // Add user.
    function(cb) {
      model.user.addUser(req.body, (err, userId) => {
        if (err) {
          return void cb(error(errid.EDB, err.message));
        }
        cb(null, { userId: userId });
      });
    }
  ], (err, user) => {
    if (err) {
      return void next(err);
    }
    res.json(user);
  });
};

/**
 * `GET /api/user/count`
 *
 * Get user count.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
module.exports.getUserCount = (req, res, next) => {
  // Parse parameters.
  const ret = parseCountParams(req.query);
  if (ret.err) {
    return void next(error(errid.EPARAM, ret.err));
  }

  model.user.getUserCount(ret.params, (err, count) => {
    if (err) {
      return void next(error(errid.EDB, err.message));
    }
    res.json({ count });
  });
};

/**
 * `GET /api/user/list`
 *
 * Get user list.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
module.exports.getUserList = (req, res, next) => {
  // Parse parameters.
  const ret = parseListParams(req.query);
  if (ret.err) {
    return void next(error(errid.EPARAM, ret.err));
  }

  model.user.getUserList(ret.params, (err, list, cursor) => {
    if (err) {
      return void next(error(errid.EDB, err.message));
    }
    res.json(list);
  });
};

/**
 * `GET /api/user/{userId}`
 *
 * Get a user.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
module.exports.getUser = (req, res, next) => {
  const opts = { fields: { expired: true, disabled: true, roles: true } };
  model.user.getUser(req.params.userId, opts, (err, user) => {
    if (err) {
      return void next(error(errid.EDB, err.message));
    } else if (!user) {
      return void next(error(errid.EUSER_NOT_FOUND));
    }
    res.json(user);
  });
};

/**
 * `PUT /api/user/{userId}`
 *
 * Update a user.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
module.exports.putUser = (req, res, next) => {
  // Check parameters.
  if (!req.user.roles.admin) {
    delete req.body.validated;
    delete req.body.password;
    delete req.body.name;
    delete req.body.info;
  }
  if (!ajv.validate('update', req.body)) {
    return void next(error(errid.EPARAM, ajv.errorsText()));
  } else if (Object.keys(req.body).length <= 0) {
    return void next(error(errid.EPARAM, 'At least one parameter'));
  }
  if (req.body.validated) {
    req.body.validated = new Date(req.body.validated);
    req.body.expired = null;
  }

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
    // Update user information.
    function(cb) {
      model.user.updateUser(req.params.userId, req.body, (err) => {
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
 * `DELETE /api/user/{userId}`
 *
 * Delete a user.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
module.exports.deleteUser = (req, res, next) => {
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
    // Remove the user.
    function(cb) {
      model.user.rmUser(req.params.userId, (err) => {
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
 * @memberof module:routes/Admin
 */
function initSchema() {
  ajv.addSchema({
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 1 },
      name: { type: 'string' },
      info: { type: 'object' }
    },
    required: [ 'email', 'password' ]
  }, 'add');

  ajv.addSchema({
    type: 'object',
    properties: {
      validated: { type: 'string', format: 'date-time' },
      disabled: { type: 'boolean' },
      roles: {
        type: 'object',
        propertyNames: { pattern: '^[A-Za-z]+[A-Za-z0-9]*$' },
        patternProperties: { '^[A-Za-z]+[A-Za-z0-9]*$': { type: 'boolean' } }
      },
      password: { type: 'string', minLength: 1 },
      name: { type: 'string' },
      info: { type: 'object' }
    },
    minProperties: 1
  }, 'update');
}

/**
 * To parse query string of `GET /api/user/count` and returns options for
 * `model.getUserCount()`.
 *
 * @private
 * @memberof module:routes/Admin
 * @param {Object} qs The `req.query` object.
 * @returns {module:routes/Index~ParsedParams}
 */
function parseCountParams(qs) {
  let params = { cond: {} };

  if (typeof(qs.email) === 'string') {
    params.cond.email = qs.email.toLowerCase();
  }
  if (!params.cond.email && (typeof(qs.contains) === 'string')) {
    params.cond.contains = qs.contains;
  }

  return { params };
}

/**
 * To parse query string of `GET /api/user/list` and returns options for
 * `model.getUserList()`.
 *
 * @private
 * @memberof module:routes/Admin
 * @param {Object} qs The `req.query` object.
 * @returns {module:routes/Index~ParsedParams}
 */
function parseListParams(qs) {
  let ret = parseCountParams(JSON.parse(JSON.stringify(qs)));
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

  params.fields = {};
  if (typeof(qs.fields) === 'string') {
    const fields = qs.fields.split(',');
    for (let f of fields) {
      if (!/^(expired|disabled)$/.test(f)) {
        return { err: '`fields` must be expired or disabled' };
      }
      params.fields[f] = true;
    }
  }
  if (params.fields) {
    params.fields.roles = true;
  } else {
    params.fields = { roles: true };
  }
  if (typeof(qs.sort) === 'string') {
    const sort = qs.sort.split(',');
    let keys = {};
    params.sort = [];
    for (let s of sort) {
      const pair = s.split(':');
      if (pair.length !== 2) {
        return { err: '`sort` must be [field:asc|desc] pairs' };
      } else if (!/^(email|created|validated|name)$/.test(pair[0])) {
        return { err: 'sort key must be email, created, validated, or name' };
      } else if (!/^(asc|desc)$/.test(pair[1])) {
        return { err: 'sort value must be asc or desc' };
      } else if (keys[pair[0]]) {
        return { err: 'duplicate sort keys' };
      }
      keys[pair[0]] = pair[1];
      params.sort.push({ key: pair[0], asc: (pair[1] === 'asc') });
    }
  }

  return { params };
}
