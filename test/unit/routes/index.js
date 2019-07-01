'use strict';

const request = require('supertest');

const error   = require('./error');
const oauth   = require('./oauth');
const session = require('./session');
const user    = require('./user');
const admin   = require('./admin');
const client  = require('./client');

// Initialize model modules.
module.exports = {
  error,
  oauth,
  session,
  user,
  admin,
  client
};

/**
 * Initialize Express app object. Call this before all test.
 *
 * @param {Object} app The Express app object.
 */
module.exports.init = function(app) {
  const agent = request.agent(app);
  error.init(agent);
  oauth.init(agent);
  session.init(agent);
  user.init(agent);
  admin.init(agent);
  client.init(agent);
};
