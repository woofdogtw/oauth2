'use strict';

const _           = require('lodash');
const async       = require('async');
const querystring = require('querystring');
const url         = require('url');

const config     = require('../../../configs/oauth2');
const testParams = require('../../test-params');
let agent;
let testHost = testParams.hostname;

/**
 * Initialize request agent. Call this before all test.
 *
 * @param {Object} _agent The Express app object to be used.
 */
module.exports.init = function(_agent) {
  agent = _agent;
};

/**
 * `GET /oauth2/login` without **state** parameter.
 */
module.exports.invalidGetLogin = function(done) {
  agent.get('/oauth2/login').expect(400).end(function(err, res) {
    done(err);
  });
};

/**
 * `POST /oauth2/login` without valid parameters.
 */
module.exports.invalidPostLogin = function(done) {
  const missingStr = 'Login failed';
  const errUserPassStr = 'Invalid account or password';

  async.waterfall([
    // Missing account.
    function(cb) {
      let data = { password: 'a', state: 'a' };
      agent.post('/oauth2/login').type('form').send(data).redirects(0)
        .end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if ((res.statusCode !== 200) ||
              (res.text.indexOf(missingStr) < 0)) {
            return void cb(Error('Not detect error login source'));
          }
          cb(null);
        });
    },
    // Missing password.
    function(cb) {
      let data = { account: 'a', state: 'a' };
      agent.post('/oauth2/login').type('form').send(data).redirects(0)
        .end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if ((res.statusCode !== 200) ||
              (res.text.indexOf(missingStr) < 0)) {
            return void cb(Error('Not detect error login source'));
          }
          cb(null);
        });
    },
    // Missing state.
    function(cb) {
      let data = { account: 'a', password: 'a' };
      agent.post('/oauth2/login').type('form').send(data).redirects(0)
        .end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if ((res.statusCode !== 200) ||
              (res.text.indexOf(missingStr) < 0)) {
            return void cb(Error('Not detect error login source'));
          }
          cb(null);
        });
    },
    // Wrong account and password.
    function(cb) {
      let data = {
        account: testParams.user.user.email + 'test',
        password: 'a',
        state: 'a'
      };
      agent.post('/oauth2/login').type('form').send(data).redirects(0)
        .end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if ((res.statusCode !== 200) ||
              (res.text.indexOf(errUserPassStr) < 0)) {
            return void cb(Error('Not detect wrong account or password'));
          }
          cb(null);
        });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * `POST /oauth2/login` for disabled user.
 */
module.exports.disabledPostLogin = function(done) {
  const errUserPassStr = 'Invalid account or password';

  const data = {
    account: testParams.user.disabled.email,
    password: testParams.user.disabled.password,
    state: 'a'
  };
  agent.post('/oauth2/login').type('form').send(data).redirects(0)
    .end(function(err, res) {
      if (err) {
        return void done(err);
      } else if ((res.statusCode !== 200) ||
          (res.text.indexOf(errUserPassStr) < 0)) {
        return void done(Error('Not detect disabled account'));
      }
      done(null);
    });
};

/**
 * `GET /oauth2/grant` without **state** parameter.
 */
module.exports.invalidGetGrant = function(done) {
  agent.get('/oauth2/grant').expect(400).end(function(err, res) {
    done(err);
  });
};

/**
 * `GET /oauth2/grant` without **state.client_id** parameter.
 */
module.exports.errorGetGrant = function(done) {
  let qs = { state:
    querystring.stringify({ client_id: testParams.client.all.id + 'test' })
  };
  agent.get('/oauth2/grant').query(qs).expect(503).end(function(err, res) {
    done(err);
  });
};

/**
 * Test `authorization_code` grant flow.
 */
module.exports.authorizationCode = function(done) {
  const stateObj = {
    client_id: testParams.client.all.id,
    response_type: 'code',
    redirect_uri: testHost + config.oauth2.redirectUri,
    scope: 'rw',
    state: 'somepage'
  };
  async.waterfall([
    // Send /oauth2/auth and wait for redirecting to the login page.
    function(cb) {
      getAuth(stateObj, function(err, location, state) {
        cb(err, location, state);
      });
    },
    // Redirect to /oauth2/login.
    function(location, state, cb) {
      agent.get(location).expect(200).end(function(err, res) {
        cb(err, state);
      });
    },
    // Send user name and password.
    function(state, cb) {
      const data = {
        state: querystring.escape(state),
        account: testParams.user.user.email,
        password: testParams.user.user.password
      };
      return void postLogin(data, function(err, location, state) {
        cb(err, location, state);
      });
    },
    // Redirect to /oauth2/grant.
    function(location, state, cb) {
      agent.get(location).expect(200).end(function(err, res) {
        cb(err, state);
      });
    },
    // Send disallow.
    function(state, cb) {
      const data = {
        state,
        allow: false
      };
      postGrant(data, function(err) {
        cb(err, state);
      });
    },
    // Send allow.
    function(state, cb) {
      const data = {
        state,
        allow: true
      };
      postGrant(data, function(err, qs, location) {
        cb(err, qs, location);
      });
    },
    // Redirect to client redirect URI.
    function(qs, location, cb) {
      agent.get(location).expect(200).end(function(err, res) {
        cb(err, qs);
      });
    },
    // Get access token.
    function(qs, cb) {
      if (stateObj.state && (stateObj.state !== qs.state)) {
        return void cb(Error('state is not the same'));
      }
      const client = testParams.client.all;
      const data = {
        grant_type: 'authorization_code',
        client_id: client.id,
        client_secret: client.clientSecret,
        scope: 'rw',
        code: qs.code,
        redirect_uri: stateObj.redirect_uri
      };
      postToken(data, function(err) {
        cb(err);
      });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * Test `authorization_code` grant flow without required parameters.
 */
module.exports.authorizationCodeNoParams = function(done) {
  const required = {
    client_id: testParams.client.all.id,
    response_type: 'code',
    redirect_uri: testHost + config.oauth2.redirectUri
  };
  async.waterfall([
    // Missing client_id.
    function(cb) {
      let p = {
        response_type: required.response_type,
        redirect_uri: required.redirect_uri
      };
      agent.get('/oauth2/auth').query(p).expect(400).end(function(err, res) {
        if (err) {
          return void cb(err);
        } else if (!res.body.error || (res.body.error !== 'invalid_request')) {
          return void cb(Error('Not respond invalid_request error'));
        } else if (!res.body.error_description ||
            (res.body.error_description.indexOf('client_id') < 0)) {
          return void cb(Error('Not hint missing client_id'));
        }
        cb(null);
      });
    },
    // Missing response_type.
    function(cb) {
      let p = {
        client_id: required.client_id,
        redirect_uri: required.redirect_uri
      };
      agent.get('/oauth2/auth').query(p).expect(400).end(function(err, res) {
        if (err) {
          return void cb(err);
        } else if (!res.body.error || (res.body.error !== 'invalid_request')) {
          return void cb(Error('Not respond invalid_request error'));
        } else if (!res.body.error_description ||
            (res.body.error_description.indexOf('response_type') < 0)) {
          return void cb(Error('Not hint missing response_type'));
        }
        cb(null);
      });
    },
    // Missing redirect_uri.
    function(cb) {
      let p = {
        client_id: required.client_id,
        response_type: required.response_type
      };
      agent.get('/oauth2/auth').query(p).expect(400).end(function(err, res) {
        if (err) {
          return void cb(err);
        } else if (!res.body.error || (res.body.error !== 'invalid_request')) {
          return void cb(Error('Not respond invalid_request error'));
        } else if (!res.body.error_description ||
            (res.body.error_description.indexOf('redirect_uri') < 0)) {
          return void cb(Error('Not hint missing redirect_uri'));
        }
        cb(null);
      });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * Test `authorization_code` grant flow with invalid parameters.
 */
module.exports.authorizationCodeInvalid = function(done) {
  const required = {
    client_id: testParams.client.all.id,
    response_type: 'code',
    redirect_uri: testHost + config.oauth2.redirectUri
  };
  async.waterfall([
    // Wrong response_type.
    function(cb) {
      let p = {
        client_id: required.client_id,
        response_type: 'type',
        redirect_uri: required.redirect_uri
      };
      agent.get('/oauth2/auth').query(p).expect(400).end(function(err, res) {
        if (err) {
          return void cb(err);
        } else if (!res.body.error ||
            (res.body.error !== 'unsupported_response_type')) {
          return void cb(Error('Not respond unsupported_response_type error'));
        }
        cb(null);
      });
    },
    // Invalid client.
    function(cb) {
      let p = {
        client_id: required.client_id + 'test',
        response_type: required.response_type,
        redirect_uri: required.redirect_uri
      };
      agent.get('/oauth2/auth').query(p).expect(400).end(function(err, res) {
        if (err) {
          return void cb(err);
        } else if (!res.body.error || (res.body.error !== 'invalid_client')) {
          return void cb(Error('Not respond invalid_client error'));
        }
        cb(null);
      });
    },
    // Invalid redirect_uri.
    function(cb) {
      let p = {
        client_id: required.client_id,
        response_type: required.response_type,
        redirect_uri: required.redirect_uri + 'test'
      };
      agent.get('/oauth2/auth').query(p).expect(400).end(function(err, res) {
        if (err) {
          return void cb(err);
        } else if (!res.body.error_description ||
            (res.body.error_description.indexOf('redirect_uri') < 0)) {
          return void cb(Error('Not hint invalid redirect_uri'));
        }
        cb(null);
      });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * Test `password` grant flow.
 */
module.exports.passwordCredentials = function(done) {
  const data = {
    client_id: testParams.client.all.id,
    client_secret: testParams.client.all.clientSecret,
    grant_type: 'password',
    username: testParams.user.user.email,
    password: testParams.user.user.password,
    scope: 'rw'
  };
  postToken(data, function(err) {
    done(err);
  });
};

/**
 * Test `client_credentials` grant flow.
 */
module.exports.clientCredentials = function(done) {
  const data = {
    client_id: testParams.client.all.id,
    client_secret: testParams.client.all.clientSecret,
    grant_type: 'client_credentials',
    scope: 'rw'
  };
  postToken(data, function(err) {
    done(err);
  });
};

/**
 * Send `GET /oauth2/auth`.
 *
 * @param {Object} qs The query string content.
 *   @param {string} qs.client_id
 *   @param {string} qs.response_type Should be `code` or `token`.
 *   @param {string} qs.redirect_uri
 *   @param {string} [qs.scope] The space-separated (%20) scopes.
 *   @param {string} [qs.state]
 * @param {function} callback
 *   @param {?Error} callback.err
 *   @param {string} callback.location The GET location to redirect.
 *   @param {string} callback.state The state parameter (unescaped) string.
 */
function getAuth(qs, callback) {
  agent.get('/oauth2/auth').query(qs).redirects(0).expect(302)
    .end(function(err, res) {
      if (err) {
        return void callback(err);
      }
      let _url = url.parse(res.headers.location);
      if (_url.pathname !== '/oauth2/login') {
        return void callback(Error('Not redirect to /oauth2/login'));
      }
      let state =
        JSON.parse(JSON.stringify(querystring.parse(_url.query))).state;
      let _qs = querystring.parse(querystring.unescape(state));
      if (!_.isEqual(_qs, qs)) {
        return void callback(Error(
          'Information of /oauth2/auth and /oauth2/login not match'));
      }
      callback(null, res.headers.location, state);
    });
}

/**
 * Send `POST /oauth2/login`.
 *
 * @param {Object} data
 *   @param {string} data.account The login account (user name).
 *   @param {string} data.password The login password.
 *   @param {string} data.state The state string of the `GET /oauth2/login`.
 * @param {function} callback
 *   @param {?Error} callback.err
 *   @param {string} callback.code The GET location to redirect.
 *   @param {string} callback.state The state parameter (unescaped) string.
 */
function postLogin(data, callback) {
  agent.post('/oauth2/login').type('form').send(data).expect(302)
    .end(function(err, res) {
      if (err) {
        return void callback(err);
      }
      let _url = url.parse(res.headers.location);
      if (_url.pathname !== '/oauth2/grant') {
        return void callback(Error('Not redirect to /oauth2/grant'));
      }
      let _qs = JSON.parse(JSON.stringify(querystring.parse(_url.query)));
      let state = _qs.state;
      let qs = querystring.parse(querystring.unescape(state));
      let stateObj = querystring.parse(querystring.unescape(
        querystring.unescape(data.state)));
      stateObj.user_id = testParams.user.user.userId;
      if (!_.isEqual(qs, stateObj)) {
        return void callback(Error(
          'Information of /oauth2/login and /oauth2/grant not match'));
      }
      callback(null, res.headers.location, state);
    });
}

/**
 * Send `POST /oauth2/grant`.
 *
 * @param {Object} data
 *   @param {boolean} data.allow To allow the grant.
 *   @param {string} data.state The state string of the `GET /oauth2/login`.
 * @param {function} callback
 *   @param {?Error} callback.err
 *   @param {Object} [callback.qs] The query string of the redirect location
 *          when `data.allow` is **true**.
 *     @param {string} callback.qs.code The authorization code.
 *     @param {string} [callback.qs.state] The **state** parameter if present.
 *   @param {string} [callback.location] The redirect location when `data.allow`
 *          is **true**.
 */
function postGrant(data, callback) {
  let state = querystring.parse(querystring.unescape(data.state));
  state.allow = data.allow ? 'yes' : 'no';
  agent.post('/oauth2/grant').type('form').send(state).expect(302)
    .end(function(err, res) {
      if (err) {
        return void callback(err);
      }
      let _url = url.parse(res.headers.location);
      if (_url.pathname !== config.oauth2.redirectUri) {
        callback(Error(`Not redirect to ${config.oauth2.redirectUri}`));
        return;
      }
      let qs = JSON.parse(JSON.stringify(querystring.parse(_url.query)));
      if (!data.allow && (qs.error !== 'access_denied')) {
        return void callback(Error('Response not "access_denied"'));
      } else if (data.allow && !qs.code) {
        return void callback(Error('No authorization code generated'));
      }
      const obj = qs.state ?
        { code: qs.code, state: qs.state } : { code: qs.code };
      callback(null, obj, res.headers.location);
    });
}

/**
 * Send `POST /oauth2/token`.
 *
 * @param {Object} data The data contains for the grant type.
 *   @param {string} data.grant_type `authorization_code`, `password`, or
 *          `client_credentials`.
 *   @param {string} data.client_id
 *   @param {string} data.client_secret
 *   @param {string} data.scope
 *   @param {string} [data.code] (required for `authorization_code`)
 *   @param {string} [data.redirect_uri] (required for `authorization_code`)
 *   @param {string} [data.username] (required for `password`)
 *   @param {string} [data.password] (required for `password`)
 * @param {function} callback
 *   @param {?Error} callback.err
 *   @param {Object} callback.token The access token information.
 *     @param {string} callback.token.access_token
 *     @param {number} callback.token.expires_in
 *     @param {string} callback.token.token_type **Bearer**
 *     @param {string} callback.token.refresh_token
 */
function postToken(data, callback) {
  let sendData = {
    grant_type: data.grant_type,
    scope: data.scope
  };
  if (data.grant_type === 'authorization_code') {
    sendData.client_id = data.client_id;
    sendData.client_secret = data.client_secret;
    sendData.code = data.code;
    sendData.redirect_uri = data.redirect_uri;
  } else if (data.grant_type === 'password') {
    sendData.username = data.username;
    sendData.password = data.password;
  }

  let auth;
  if (data.client_id && data.client_secret) {
    auth =
      Buffer.from(`${data.client_id}:${data.client_secret}`).toString('base64');
  }
  agent.post('/oauth2/token').type('form')
    .set('Authorization', `Basic ${auth}`).send(sendData).expect(200)
    .end(function(err, res) {
      if (err) {
        return void callback(err);
      }
      const body = res.body;
      if (!body.access_token || (typeof(body.access_token) !== 'string') ||
          !Number.isInteger(body.expires_in) || (body.expires_in < 0) ||
          (body.token_type !== 'Bearer')) {
        return void callback(Error('Token content error'));
      } else if ((data.grant_type !== 'client_credentials') &&
          (!body.refresh_token || (typeof(body.refresh_token) !== 'string'))) {
        return void callback(Error('Token content error'));
      }
      callback(null);
    });
}
