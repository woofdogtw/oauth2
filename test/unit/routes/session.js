'use strict';

const _     = require('lodash');
const async = require('async');

const errid      = require('../../../lib/error').errid;
const testParams = require('../../test-params');

let agent;

/**
 * Initialize request agent. Call this before all test.
 *
 * @param {Object} _agent The Express app object to be used.
 */
module.exports.init = function(_agent) {
  agent = _agent;
};

/**
 * `POST /api/session/login`.
 */
module.exports.login = function(done) {
  const data = {
    username: testParams.user.user.email,
    password: testParams.user.user.password
  };
  agent.post('/api/session/login').type('form').send(data).expect(200)
    .end(function(err, res) {
      if (err) {
        return void done(err);
      }
      const token = res.body;
      if ((typeof(token.accessToken) !== 'string') ||
          (typeof(token.refreshToken) !== 'string')) {
        return void done(
          Error('The token is invalid: ' + JSON.stringify(token)));
      }
      done(null);
    });
};

/**
 * `POST /api/session/login` with wrong user name and password.
 */
module.exports.loginWrong = function(done) {
  let data = {
    username: testParams.user.user.email + '1',
    password: testParams.user.user.password
  };
  agent.post('/api/session/login').type('form').send(data)
    .expect(errid.ESESSION_LOGIN.status).end(function(err, res) {
      if (err) {
        return void done(err);
      }
      const errObj = res.body;
      if (!_.isEqual(errObj, errid.ESESSION_LOGIN.obj)) {
        return void done(
          Error('The error response is wrong: ' + JSON.stringify(errObj)));
      }
      done(null);
    });
};

/**
 * `POST /api/session/logout`.
 */
module.exports.logout = function(done) {
  async.waterfall([
    // Log in to get the access token.
    function(cb) {
      const data = {
        username: testParams.user.user.email,
        password: testParams.user.user.password
      };
      agent.post('/api/session/login').type('form').send(data).expect(200)
        .end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          cb(null, res.body.accessToken);
        });
    },
    // Remove the access token.
    function(accessToken, cb) {
      agent.post('/api/session/logout')
        .set('Authorization', `Bearer ${accessToken}`).expect(200)
        .end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          cb(null, accessToken);
        });
    },
    // Check if the access token is invalid.
    function(accessToken, cb) {
      agent.post('/api/session/logout')
        .set('Authorization', `Bearer ${accessToken}`).expect(401)
        .end(function(err, res) {
          cb(err);
        });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * `POST /api/session/logout` with invalid parameters.
 */
module.exports.logoutInvalid = function(done) {
  agent.post('/api/session/logout')
    .set('Authorization', 'Beare 1').expect(400).end(function(err, res) {
      if (err) {
        return void done(err);
      }
      const errObj = res.body;
      if (errObj.code !== errid.EPARAM.obj.code) {
        return void done(
          Error('The error response is wrong: ' + JSON.stringify(errObj)));
      }
      done(null);
    });
};

/**
 * `POST /api/session/refresh`.
 */
module.exports.refresh = function(done) {
  async.waterfall([
    // Log in to get the access token.
    function(cb) {
      const data = {
        username: testParams.user.user.email,
        password: testParams.user.user.password
      };
      agent.post('/api/session/login').type('form').send(data).expect(200)
        .end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          cb(null, res.body.refreshToken);
        });
    },
    // Refresh the token.
    function(refreshToken, cb) {
      agent.post('/api/session/refresh').send({ refreshToken }).expect(200)
        .end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          const token = res.body;
          if ((typeof(token.accessToken) !== 'string') ||
              (typeof(token.refreshToken) !== 'string')) {
            return void done(
              Error('The token is invalid: ' + JSON.stringify(token)));
          }
          cb(null, refreshToken);
        });
    },
    // Check if the refresh token is invalid.
    function(refreshToken, cb) {
      agent.post('/api/session/refresh').send({ refreshToken }).expect(401)
        .end(function(err, res) {
          cb(err);
        });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * `POST /api/session/refresh` with invalid parameters.
 */
module.exports.refreshInvalid = function(done) {
  agent.post('/api/session/refresh')
    .send({ refreshTokenToken: 1 }).expect(400).end(function(err, res) {
      if (err) {
        return void done(err);
      }
      const errObj = res.body;
      if (errObj.code !== errid.EPARAM.obj.code) {
        return void done(
          Error('The error response is wrong: ' + JSON.stringify(errObj)));
      }
      done(null);
    });
};
