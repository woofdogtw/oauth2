'use strict';

const _     = require('lodash');
const Ajv   = require('ajv');
const async = require('async');

const errid      = require('../../../lib/error').errid;
const testParams = require('../../test-params');

const tokenUdCa = testParams.token.udca.accessToken;
const tokenUuCa = testParams.token.uuca.accessToken;

let agent;
let ajv = new Ajv({ format: 'full' });

/**
 * Initialize request agent. Call this before all test.
 *
 * @param {Object} _agent The Express app object to be used.
 */
module.exports.init = function(_agent) {
  agent = _agent;
};

/**
 * `GET /api/user`.
 */
module.exports.getUser = function(done) {
  agent.get('/api/user')
    .set('Authorization', `Bearer ${tokenUdCa}`)
    .expect(200).end(function(err, res) {
      if (err) {
        return void done(err);
      }
      const schema = {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          email: { type: 'string', format: 'email' },
          created: { type: 'string', format: 'date-time' },
          validated: { type: [ 'string', 'null' ], foramt: 'date-time' },
          roles: {
            type: 'object',
            patternNames: { pattern: '^[A-Za-z]+[A-Za-z0-9]*$' },
            patternProperties:
              { '^[A-Za-z]+[A-Za-z0-9]*$': { type: 'boolean' } }
          },
          name: { type: 'string' },
          info: { type: 'object' }
        },
        required: [
          'userId', 'email', 'created', 'validated', 'roles', 'name', 'info'
        ],
        additionalProperties: false
      };
      if (!ajv.validate(schema, res.body)) {
        return void done(Error(ajv.errorsText()));
      }
      const user = res.body;
      const u = testParams.user.dev;
      if ((user.userId !== u.userId) ||
          (user.email.toLowerCase() !== u.email) ||
          !_.isEqual(new Date(user.created), u.created) ||
          !_.isEqual(new Date(user.validated), u.validated) ||
          !_.isEqual(user.roles, u.roles) || (user.name !== u.name) ||
          !_.isEqual(user.info, u.info)) {
        return void done(Error('User content is not the same as inserted'));
      }
      done(null);
    });
};

/**
 * `GET /api/user` with normal user.
 */
module.exports.getUserNormal = function(done) {
  agent.get('/api/user')
    .set('Authorization', `Bearer ${tokenUuCa}`)
    .expect(200).end(function(err, res) {
      if (err) {
        return void done(err);
      }
      const schema = {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          email: { type: 'string', format: 'email' },
          created: { type: 'string', format: 'date-time' },
          validated: { type: [ 'string', 'null' ], foramt: 'date-time' },
          name: { type: 'string' },
          info: { type: 'object' }
        },
        required: [
          'userId', 'email', 'created', 'validated', 'name', 'info'
        ],
        additionalProperties: false
      };
      if (!ajv.validate(schema, res.body)) {
        return void done(Error(ajv.errorsText()));
      }
      const user = res.body;
      const u = testParams.user.user;
      if ((user.userId !== u.userId) ||
          (user.email.toLowerCase() !== u.email) ||
          !_.isEqual(new Date(user.created), u.created) ||
          !_.isEqual(new Date(user.validated), u.validated) ||
          (user.name !== u.name) || !_.isEqual(user.info, u.info)) {
        return void done(Error('User content is not the same as inserted'));
      }
      done(null);
    });
};

/**
 * `GET /api/user` with wrong token.
 */
module.exports.getUserWrongToken = function(done) {
  agent.get('/api/user')
    .set('Authorization', `Bearer ${tokenUdCa}1`)
    .expect(401).end(function(err, res) {
      if (err) {
        return void done(err);
      } else if (res.body.code !== errid.EAUTH.obj.code) {
        return void done(Error('Should respond EAUTH error code'));
      }
      done(null);
    });
};

/**
 * `PUT /api/user`.
 */
module.exports.putUser = function(done) {
  const updates = {
    password: testParams.user.user.password + '1',
    name: 'New name',
    info: {
      a: 1,
      b: 'B',
      c: false,
      d: null,
      e: { key: 'value' },
      f: [ 1, true ]
    }
  };

  async.waterfall([
    // Update the information.
    function(cb) {
      agent.put('/api/user')
        .set('Authorization', `Bearer ${tokenUuCa}`)
        .send(updates).expect(200).end(function(err, res) {
          cb(err);
        });
    },
    // Get the information and check if server updates them.
    function(cb) {
      agent.get('/api/user')
        .set('Authorization', `Bearer ${tokenUuCa}`)
        .expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if ((res.body.name !== updates.name) ||
              !_.isEqual(res.body.info, updates.info)) {
            return void cb(Error('Update information failed'));
          }
          cb(null);
        });
    },
    // Login with new password.
    function(cb) {
      const data = {
        username: testParams.user.user.email,
        password: updates.password
      };
      agent.post('/api/session/login').type('form').send(data).expect(200)
        .end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          const token = res.body;
          if ((typeof(token.accessToken) !== 'string') ||
              (typeof(token.refreshToken) !== 'string')) {
            return void cb(Error('Login with new password failed'));
          }
          cb(null);
        });
    },
    // Restore the information.
    function(cb) {
      const restore = {
        password: testParams.user.user.password,
        name: testParams.user.user.name,
        info: testParams.user.user.info
      };
      agent.put('/api/user')
        .set('Authorization', `Bearer ${tokenUuCa}`)
        .send(restore).expect(200).end(function(err, res) {
          cb(err);
        });
    },
  ], function(err) {
    done(err);
  });
};

/**
 * `PUT /api/user` with invalid parameters.
 */
module.exports.putUserInvalid = function(done) {
  async.waterfall([
    // Send no parameter.
    function(cb) {
      agent.put('/api/user')
        .set('Authorization', `Bearer ${tokenUuCa}`)
        .expect(400).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          }
          cb(null);
        });
    },
    // Send not exist parameter.
    function(cb) {
      agent.put('/api/user')
        .set('Authorization', `Bearer ${tokenUuCa}`)
        .send({ test: 'test' }).expect(400).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          }
          cb(null);
        });
    },
    // Send invalid password.
    function(cb) {
      agent.put('/api/user')
        .set('Authorization', `Bearer ${tokenUuCa}`)
        .send({ password: 1 }).expect(400).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          }
          cb(null);
        });
    },
    // Send invalid name.
    function(cb) {
      agent.put('/api/user')
        .set('Authorization', `Bearer ${tokenUuCa}`)
        .send({ name: null }).expect(400).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          }
          cb(null);
        });
    },
    // Send invalid info.
    function(cb) {
      agent.put('/api/user')
        .set('Authorization', `Bearer ${tokenUuCa}`)
        .send({ info: [] }).expect(400).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          }
          cb(null);
        });
    }
  ], function(err) {
    done(err);
  });
};
