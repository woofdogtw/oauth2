/**
 * This module defines all APIs and handles errors of OAuth2.
 *
 * @module routes/Index
 */
'use strict';

// 3rd party modules.
const OAuth2Server = require('oauth2-server');

// Server modules.
const { error, errid } = require('../../lib/error');
const config = require('../../configs/oauth2');
const logger = require('../../lib/logger');
const model  = require('../../models/oauth2');

// URI routing modules.
const oauth2Routes  = require('./oauth2');
const sessionRoutes = require('./session');
const userRoutes    = require('./user');
const adminRoutes   = require('./admin');
const clientRoutes  = require('./client');

/**
 * The parsed parameters (typically used for count and list query parameters).
 *
 * @typedef {Object} ParsedParams
 * @property {?string} err Error message.
 * @property {Object} params The parsed parameters.
 */

// Create an OAuth2 server instance.
const server = new OAuth2Server({
  model: model.oauth,
  accessTokenLifetime: config.oauth2.accessTokenLifetime,
  refreshTokenLifetime: config.oauth2.refreshTokenLifetime
});

/**
 * To register APIs to the Express instance.
 *
 * @param {Object} app The Express instance.
 */
module.exports = (app) => {
  // For authorization code and implicit token.
  app.get('/oauth2/auth', oauth2Routes.getAuth);

  // For access token.
  app.post('/oauth2/token', oauth2Routes.genPostToken(server));

  // For login page.
  app.get('/oauth2/login', oauth2Routes.getLogin);
  app.post('/oauth2/login', oauth2Routes.postLogin);

  // For user grant.
  app.get('/oauth2/grant', oauth2Routes.getGrant);
  app.post('/oauth2/grant', oauth2Routes.genPostGrant(server));

  // Default redirect URI for retrieving authorization code.
  app.get(config.oauth2.redirectUri, oauth2Routes.getRedirectUri);

  // OAuth2 error handling.
  app.use(oauth2ErrorHandle);

  // For session APIs.
  app.post('/api/session/login', sessionRoutes.postLogin);
  app.post('/api/session/logout', authenticate, sessionRoutes.postLogout);
  app.post('/api/session/refresh', sessionRoutes.postRefresh);

  // For user information APIs.
  app.get('/api/user', authorize, userRoutes.getUser);
  app.put('/api/user', authorize, userRoutes.putUser);

  // For user administration APIs.
  app.post('/api/user', authAdmin, adminRoutes.postUser);
  app.get('/api/user/count', authAM, adminRoutes.getUserCount);
  app.get('/api/user/list', authAM, adminRoutes.getUserList);
  app.get('/api/user/:userId', authAM, adminRoutes.getUser);
  app.put('/api/user/:userId', authAM, adminRoutes.putUser);
  app.delete('/api/user/:userId', authAdmin, adminRoutes.deleteUser);

  // For client administration APIs.
  app.post('/api/client', authDev, clientRoutes.postClient);
  app.get('/api/client/count', authDev, clientRoutes.getClientCount);
  app.get('/api/client/list', authDev, clientRoutes.getClientList);
  app.get('/api/client/:clientId', authDev, clientRoutes.getClient);
  app.put('/api/client/:clientId', authDev, clientRoutes.putClient);
  app.delete('/api/client/:clientId', authDev, clientRoutes.deleteClient);
  app.delete('/api/client/user/:userId', authAdmin,
    clientRoutes.deleteClientUser);

  // API error handling.
  app.use(apiErrorHandle);
};

/**
 * Authenticate the token and get user ID in `req.user.userId`.
 *
 * @private
 * @memberof module:routes/Index
 * @param {OAuth2Error} err
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
function authenticate(req, res, next) {
  _authenticate(req, res, (err, userId) => {
    if (err) {
      return void next(err);
    }
    req.user = { userId };
    next(null);
  });
}

/**
 * Authorize the token and get user information in `req.user`.
 *
 * @private
 * @memberof module:routes/Index
 * @param {OAuth2Error} err
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
function authorize(req, res, next) {
  _authorize(req, res, (err, user) => {
    if (err) {
      return void next(err);
    }
    req.user = user;
    next(null);
  });
}

/**
 * Authorize the administrator token and get user information in `req.user`.
 *
 * @private
 * @memberof module:routes/Index
 * @param {OAuth2Error} err
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
function authAdmin(req, res, next) {
  _authorize(req, res, (err, user) => {
    if (err) {
      return void next(err);
    } else if (!user.validated || user.disabled || !user.roles ||
        !user.roles.admin) {
      return void next(error(errid.EPERM));
    }
    req.user = user;
    next(null);
  });
}

/**
 * Authorize the token and get user information in `req.user`.
 *
 * For: admin, manager.
 *
 * @private
 * @memberof module:routes/Index
 * @param {OAuth2Error} err
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
function authAM(req, res, next) {
  _authorize(req, res, (err, user) => {
    if (err) {
      return void next(err);
    } else if (!user.validated || user.disabled || !user.roles ||
        !user.roles.admin && !user.roles.manager) {
      return void next(error(errid.EPERM));
    }
    req.user = user;
    next(null);
  });
}

/**
 * Authorize the developer token and get user information in `req.user`.
 *
 * @private
 * @memberof module:routes/Index
 * @param {OAuth2Error} err
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
function authDev(req, res, next) {
  _authorize(req, res, (err, user) => {
    if (err) {
      return void next(err);
    } else if (!user.validated || user.disabled || !user.roles ||
        !user.roles.admin && !user.roles.dev) {
      return void next(error(errid.EPERM));
    }
    req.user = user;
    next(null);
  });
}

/**
 * Authenticate the token and get user ID.
 *
 * @private
 * @memberof module:routes/Index
 * @param {OAuth2Error} err
 * @param {Object} req
 * @param {Object} res
 * @param {function} callback
 *   @param {?SysError} callback.err
 *   @param {string} callback.userId The user ID of the token.
 */
function _authenticate(req, res, callback) {
  let _req = new OAuth2Server.Request(req);
  let _res = new OAuth2Server.Response(res);
  const opts = {
    addAcceptedScopesHeader: false,
    addAuthorizedScopesHeader: false
  };
  server.authenticate(_req, _res, opts, (err, token) => {
    if (err) {
      let _err;
      switch (err.code) {
      case 400:
        _err = error(errid.EPARAM, err.message);
        break;
      case 401:
        _err = error(errid.EAUTH, err.message);
        break;
      default:
        _err = error(errid.EUNKNOWN, err.message);
      }
      return void callback(_err);
    } else if (!token) {
      return void callback(error(errid.EUNKNOWN, 'Authentication fail'));
    }
    callback(null, token.user.userId);
  });
}

/**
 * Authorize the token and get user information.
 *
 * @private
 * @memberof module:routes/Index
 * @param {OAuth2Error} err
 * @param {Object} req
 * @param {Object} res
 * @param {function} callback
 *   @param {?SysError} callback.err
 *   @param {Object} callback.user The user information.
 */
function _authorize(req, res, callback) {
  _authenticate(req, res, (err, userId) => {
    if (err) {
      return void callback(err);
    }
    const opts = { fields: { roles: true } };
    model.user.getUser(userId, opts, (err, user) => {
      if (err) {
        return void callback(error(errid.EDB, err.message));
      } else if (!user) {
        return void callback(error(errid.EAUTH));
      }
      callback(null, user);
    });
  });
}

/**
 * Error handling for OAuth2.
 *
 * @private
 * @memberof module:routes/Index
 * @param {OAuth2Error} err
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
function oauth2ErrorHandle(err, req, res, next) {
  if (err) {
    if (!err.code || !err.name) {
      return void next(err);
    }
    return void res.status(err.code).json({
      error: err.name,
      error_description: err.message
    });
  }
  next(null);
}

/**
 * Error handling for APIs.
 *
 * @private
 * @memberof module:routes/Index
 * @param {SysError} err
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
function apiErrorHandle(err, req, res, next) {
  if (err) {
    if (!err.status) {
      if (err.stack) {
        logger.error(err.stack);
      }
      err = error(errid.EUNKNOWN, err.message);
    }
    res._err = err.obj.message;
    return void res.status(err.status).json(err.obj);
  }
  next(null);
}
