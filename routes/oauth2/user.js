/**
 * This module implements user information APIs.
 *
 * @module routes/User
 */
'use strict';

// 3rd party modules.
const Ajv = require('ajv');

// Server modules.
const { error, errid } = require('../../lib/error');
const model = require('../../models/oauth2');

/**
 * Schema with `update`.
 */
let ajv = new Ajv({
  format: 'full',
  removeAdditional: 'all'
});
initSchema();

/**
 * `GET /api/user`
 *
 * Get user information.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
module.exports.getUser = (req, res, next) => {
  if (Object.keys(req.user.roles).length <= 0) {
    delete req.user.roles;
  }
  res.json(req.user);
};

/**
 * `PUT /api/user`
 *
 * Update user information.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
module.exports.putUser = (req, res, next) => {
  // Check parameters.
  if (!ajv.validate('update', req.body)) {
    return void next(error(errid.EPARAM, ajv.errorsText()));
  } else if (Object.keys(req.body).length <= 0) {
    return void next(error(errid.EPARAM, 'At least one parameter'));
  }

  model.user.updateUser(req.user.userId, req.body, (err) => {
    if (err) {
      return void next(error(errid.EDB, err.message));
    }
    res.end();
  });
};

/**
 * To initialize schema for this module.
 *
 * @private
 * @memberof module:routes/User
 */
function initSchema() {
  ajv.addSchema({
    type: 'object',
    properties: {
      password: { type: 'string', minLength: 1 },
      name: { type: 'string' },
      info: { type: 'object' }
    },
    minProperties: 1
  }, 'update');
}
