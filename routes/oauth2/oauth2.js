/**
 * This module implements APIs for OAuth2 flow.
 *
 * @module routes/OAuth2
 */
'use strict';

// Node.js modules.
const querystring = require('querystring');

// 3rd party modules.
const async        = require('async');
const OAuth2Server = require('oauth2-server');

// Server modules.
const config = require('../../configs/oauth2');
const model  = require('../../models/oauth2');

/**
 * `GET /oauth2/auth`
 *
 * This is used for getting an authorization code (installed applications) or an
 * access token (client-side applications).
 *
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 * @see **Forming the URL** section in [OAuth2-app]{@tutorial OAuth2-app} or
 *      [OAuth2-client]{@tutorial OAuth2-client} tutorials.
 */
module.exports.getAuth = (req, res, next) => {
  async.waterfall([
    // Check parameters.
    function(cb) {
      let errDesc = null;
      const query = req.query;
      if (!query.client_id) {
        errDesc = 'No client_id';
      } else if (!query.response_type) {
        errDesc = 'No response_type';
      } else if ((query.response_type !== 'code') &&
          (query.response_type !== 'token'))  {
        return void cb(new OAuth2Server.UnsupportedResponseTypeError(
          'response_type is not code or token'));
      } else if (!query.redirect_uri) {
        errDesc = 'No redirect_uri';
      }
      if (errDesc) {
        return void cb(new OAuth2Server.InvalidRequestError(errDesc));
      }

      req.query = {
        client_id: query.client_id,
        response_type: query.response_type,
        redirect_uri: querystring.unescape(req.query.redirect_uri)
      };
      if (query.scope) {
        req.query.scope = querystring.unescape(query.scope);
      }
      if (query.state) {
        req.query.state = querystring.unescape(query.state);
      }
      cb(null);
    },
    // Check parameters with database.
    function(cb) {
      model.oauth.getClient(req.query.client_id, null, (err, client) => {
        if (err) {
          return void cb(new OAuth2Server.ServerError(err));
        } else if (!client || !client.redirectUris) {
          return void cb(new OAuth2Server.InvalidClientError());
        } else if (!client.redirectUris.includes(req.query.redirect_uri)) {
          return void cb(
            new OAuth2Server.InvalidRequestError('Invalid redirect_uri'));
        }
        cb(null);
      });
    }
  ], (err) => {
    if (err) {
      return void next(err);
    }

    // Generate query string for redirect back after login.
    for (let key in req.query) {
      // Re-escape parameters no matter they are escaped.
      req.query[key] = querystring.escape(querystring.unescape(req.query[key]));
    }
    const qs = querystring.escape(querystring.stringify(req.query));
    res.redirect(`/oauth2/login?state=${qs}`);
  });
};

/**
 * `GET /oauth2/login`
 *
 * This is used for user login operations. This must be redirected by the OAuth2
 * server internally.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
module.exports.getLogin = (req, res, next) => {
  // Filter invalid login.
  if (!querystring.stringify(req.query) || !req.query.state) {
    next(new OAuth2Server.InvalidRequestError('Must login from /oauth2/auth'));
    return;
  }
  res.render('oauth2/login', { state: querystring.escape(req.query.state) });
};

/**
 * `POST /oauth2/login`
 *
 * This is used for user login operations by sending user credentials. This must
 * be used for the login page only.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
module.exports.postLogin = (req, res, next) => {
  async.waterfall([
    // Check POST parameters.
    function(cb) {
      if (!querystring.stringify(req.body) || !req.body.state ||
          !req.body.account || !req.body.password) {
        return void res.render('oauth2/login',
          { state: req.body.state, error: 'Login failed' });
      }
      cb(null);
    },
    // Check user information with database.
    function(cb) {
      const account = req.body.account.toLowerCase().trim();
      model.oauth.getUser(account, req.body.password, (err, user) => {
        if (err) {
          return void cb(new OAuth2Server.ServerError(err));
        } else if (!user) {
          return void res.render('oauth2/login',
            { state: req.body.state, error: 'Invalid account or password' });
        }
        cb(null, user.userId);
      });
    }
  ], (err, userId) => {
    if (err) {
      return void next(err);
    }

    req.body.state = `${req.body.state}%26user_id=${userId}`;
    res.redirect(`/oauth2/grant?state=${req.body.state}`);
  });
};

/**
 * `GET /oauth2/grant`
 *
 * This is used for user consent operations. This must be redirected by the
 * OAuth2 server internally.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
module.exports.getGrant = (req, res, next) => {
  async.waterfall([
    // Filter invalid login.
    function(cb) {
      if (!querystring.stringify(req.query) || !req.query.state) {
        return void cb(
          new OAuth2Server.InvalidRequestError('Must login from /oauth2/auth'));
      }
      cb(null);
    },
    // Get client information to display.
    function(cb) {
      const params = querystring.parse(req.query.state);
      model.oauth.getClient(params.client_id, null, (err, client) => {
        if (err) {
          return void cb(new OAuth2Server.ServerError(err));
        } else if (!client) {
          return void cb(new OAuth2Server.ServerError('Cannot find client'));
        }
        cb(null, client.name);
      });
    }
  ], (err, clientName) => {
    if (err) {
      return void next(err);
    }

    const params = querystring.parse(req.query.state);
    const renderParams = {
      user_id: params.user_id,
      client_id: params.client_id,
      response_type: params.response_type,
      redirect_uri: params.redirect_uri,
      scope: params.scope,
      state: params.state,
      client_name: clientName
    };
    res.render('oauth2/grant', renderParams);
  });
};

/**
 * `POST /oauth2/grant`
 *
 * This is used for user consent operations. This must be used for the consent
 * page only.
 *
 * @param {OAuth2Server} server The `OAuth2Server` instance.
 * @returns {function} The express middleware for `POST /oauth2/grant`.
 */
module.exports.genPostGrant = (server) => {
  return (req, res, next) => {
    req.body.user_id = querystring.unescape(req.body.user_id),
    req.body.client_id = querystring.unescape(req.body.client_id);
    req.body.response_type = querystring.unescape(req.body.response_type);
    req.body.redirect_uri = querystring.unescape(req.body.redirect_uri);
    if (req.body.scope) {
      req.body.scope = querystring.unescape(req.body.scope);
    }
    if (req.body.state) {
      req.body.state = querystring.unescape(req.body.state);
    }
    req.query.allowed = (req.body.allow === 'yes') ? 'true' : 'false';

    // Authorization code options.
    const options = {
      allowEmptyState: true,
      authenticateHandler: {
        handle: (req, res) => {
          return { userId: req.body.user_id };
        }
      }
    };
    const _req = new OAuth2Server.Request(req);
    const _res = new OAuth2Server.Response(res);
    server.authorize(_req, _res, options, (err, code) => {
      let qs;
      if (err) {
        qs = {
          error: err.name,
          error_description: err.message
        };
      } else if (!code || (typeof(code.authorizationCode) !== 'string')) {
        qs = {
          error: 'server_error',
          error_description: 'No authorization code generated'
        };
      } else {
        qs = {
          code: code.authorizationCode
        };
      }
      if (req.body.state) {
        qs.state = req.body.state;
      }
      res.redirect(
        `${config.oauth2.redirectUri}?${querystring.stringify(qs)}`);
    });
  };
};

/**
 * `POST /oauth2/token`
 *
 * @param {OAuth2Server} server The `OAuth2Server` instance.
 * @returns {function} The express middleware for `POST /oauth2/token`.
 */
module.exports.genPostToken = (server) => {
  return (req, res, next) => {
    let _req = new OAuth2Server.Request(req);
    let _res = new OAuth2Server.Response(res);
    server.token(_req, _res, {}, (err, token) => {
      if (err) {
        return void next(err);
      }
      res.json({
        access_token: token.accessToken,
        expires_in: Math.ceil(
          (token.accessTokenExpiresAt.getTime() - Date.now()) / 1000),
        token_type: 'Bearer',
        refresh_token: token.refreshToken
      });
    });
  };
};

/**
 * This is only used for redirect authorization code and access token for
 * installed applications or Apps.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {function} next
 */
module.exports.getRedirectUri = (req, res, next) => {
  res.end();
};
