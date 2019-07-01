/**
 * This module implements session APIs.
 *
 * @module routes/Session
 */
'use strict';

// 3rd party modules.
const async = require('async');

// Server modules.
const { error, errid } = require('../../lib/error');
const config = require('../../configs/oauth2');
const model  = require('../../models/oauth2');

/**
 * `POST /api/session/login`
 *
 * Log in the system.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
module.exports.postLogin = (req, res, next) => {
  async.waterfall([
    // Check user name and password.
    function(cb) {
      const { username, password } = req.body;
      model.oauth.getUser(username || '', password || '', (err, user) => {
        if (err) {
          return void cb(error(errid.EDB, err.message));
        } else if (!user) {
          return void cb(error(errid.ESESSION_LOGIN));
        }
        cb(null, user.userId);
      });
    },
    // Generate access token and refresh token.
    function(userId, cb) {
      generateToken(userId, (err, token) => {
        cb(err, token);
      });
    }
  ], (err, token) => {
    if (err) {
      return void next(err);
    }
    res.json(token);
  });
};

/**
 * `POST /api/session/logout`
 *
 * Log out the system.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
module.exports.postLogout = (req, res, next) => {
  const token = req.headers.authorization.match(/Bearer\s(\S+)/)[1];
  model.token.rmAccessToken(token, (err) => {
    if (err) {
      return void next(error(errid.EDB, err.message));
    }
    res.end();
  });
};

/**
 * `POST /api/session/refresh`
 *
 * Refresh the token.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
module.exports.postRefresh = (req, res, next) => {
  async.waterfall([
    // Check parameters.
    function(cb) {
      const refreshToken = req.body.refreshToken;
      if (!refreshToken || (typeof(refreshToken) !== 'string')) {
        return void cb(error(errid.EPARAM, '`refreshToken` must be a string'));
      }
      cb(null);
    },
    // Check if the refresh token exists.
    function(cb) {
      const refreshToken = req.body.refreshToken;
      model.oauth.getRefreshToken(refreshToken, (err, token) => {
        if (err) {
          return void cb(error(errid.EDB, err.message));
        } else if (!token) {
          return void cb(error(errid.EAUTH, 'Invalid refresh token'));
        }
        cb(null, token);
      });
    },
    // Generate access token and refresh token.
    function(oldToken, cb) {
      generateToken(oldToken.user.userId, (err, token) => {
        cb(err, token, oldToken);
      });
    },
    // Revoke the refresh token.
    function(token, oldToken, cb) {
      model.oauth.revokeToken(oldToken, (err) => {
        if (err) {
          return void cb(error(errid.EDB, err.message));
        }
        cb(null, token);
      });
    }
  ], (err, token) => {
    if (err) {
      return void next(err);
    }
    res.json(token);
  });
};

/**
 * To generate the new access token and refresh token.
 *
 * @private
 * @memberof module:routes/Session
 * @param {string} userId The user ID.
 * @param {function} callback
 *   @param {?SysError} callback.err
 *   @param {Object} callback.token The access token and refresh token.
 *     @param {string} callback.token.accessToken
 *     @param {string} callback.token.refreshToken
 */
function generateToken(userId, callback) {
  async.waterfall([
    // Generate access token and refresh token.
    function(cb) {
      model.oauth.generateAccessToken(null, null, '', (err, access) => {
        if (err) {
          return void cb(error(errid.EDB, err.message));
        }
        model.oauth.generateRefreshToken(null, null, '', (err, refresh) => {
          if (err) {
            return void cb(error(errid.EDB, err.message));
          }
          const now = Date.now();
          cb(null, {
            token: {
              accessToken: access,
              accessTokenExpiresAt:
                new Date(now + config.oauth2.accessTokenLifetime * 1000),
              refreshToken: refresh,
              refreshTokenExpiresAt:
                new Date(now + config.oauth2.refreshTokenLifetime * 1000)
            },
            client: { clientId: '' },
            user: { userId }
          });
        });
      });
    },
    // Save token.
    function(obj, cb) {
      model.oauth.saveToken(obj.token, obj.client, obj.user, (err) => {
        if (err) {
          return void cb(error(errid.EDB, err.message));
        }
        cb(null, {
          accessToken: obj.token.accessToken,
          refreshToken: obj.token.refreshToken
        });
      });
    }
  ], (err, token) => {
    callback(err, token);
  });
}
