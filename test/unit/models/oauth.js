'use strict';

const _     = require('lodash');
const async = require('async');

const testParams = require('../../test-params');
let testModel;

/**
 * Initialize model object. Call this before all test.
 *
 * @param {Object} model The model object to be used.
 */
module.exports.init = function(model) {
  testModel = model.oauth;
};

/**
 * Test `oauth.getClient(clientId, clientSecret)`.
 */
module.exports.getClient = function(done) {
  const id = testParams.client.all.id;
  const secret = testParams.client.all.clientSecret;
  testModel.getClient(id, secret, function(err, client) {
    if (err) {
      return void done(err);
    } else if (!client || !client.id || (typeof(client.id) !== 'string')) {
      return void done(Error('Cannot get client'));
    }
    if (!Array.isArray(client.grants)) {
      return void done(Error('Client grants format error'));
    }
    for (let val of client.grants) {
      if (typeof(val) !== 'string') {
        return void done(Error('Client grants format error'));
      }
    }
    if (client.redirectUris) {
      if (!Array.isArray(client.redirectUris)) {
        return void done(Error('Client redirectUris format error'));
      }
      for (let val of client.redirectUris) {
        if (typeof(val) !== 'string') {
          return void done(Error('Client redirectUris format error'));
        }
      }
    }
    done(null);
  });
};

/**
 * Test `oauth.getClient(clientId, clientSecret)` without secret.
 */
module.exports.getClientNoSecret = function(done) {
  const id = testParams.client.all.id;
  testModel.getClient(id, null, function(err, client) {
    if (err) {
      return void done(err);
    } else if (!client || !client.id || (typeof(client.id) !== 'string')) {
      return void done(Error('Cannot get client'));
    }
    if (!Array.isArray(client.grants)) {
      return void done(Error('Client grants format error'));
    }
    for (let val of client.grants) {
      if (typeof(val) !== 'string') {
        return void done(Error('Client grants format error'));
      }
    }
    if (client.redirectUris) {
      if (!Array.isArray(client.redirectUris)) {
        return void done(Error('Client redirectUris format error'));
      }
      for (let val of client.redirectUris) {
        if (typeof(val) !== 'string') {
          return void done(Error('Client redirectUris format error'));
        }
      }
    }
    done(null);
  });
};

/**
 * Test `oauth.getClient(clientId, clientSecret)` without authorization_code
 * support.
 */
module.exports.getClientNoAuthCode = function(done) {
  const id = testParams.client.noAuthCode.id;
  testModel.getClient(id, null, function(err, client) {
    if (err) {
      return void done(err);
    } else if (!client || !client.id || (typeof(client.id) !== 'string')) {
      return void done(Error('Cannot get client'));
    }
    if (!Array.isArray(client.grants)) {
      return void done(Error('Client grants format error'));
    }
    for (let val of client.grants) {
      if (typeof(val) !== 'string') {
        return void done(Error('Client grants format error'));
      }
    }
    if (client.redirectUris) {
      if (!Array.isArray(client.redirectUris)) {
        return void done(Error('Client redirectUris format error'));
      }
      for (let val of client.redirectUris) {
        if (typeof(val) !== 'string') {
          return void done(Error('Client redirectUris format error'));
        }
      }
    }
    done(null);
  });
};

/**
 * Test `oauth.getClient(clientId, clientSecret)` with wrong client ID.
 */
module.exports.getClientWrong = function(done) {
  const id = testParams.client.all.id;
  const secret = testParams.client.all.clientSecret;
  testModel.getClient(id + '1', secret, function(err, client) {
    if (err) {
      return void done(err);
    } else if (client) {
      return void done(Error('Get client which does not exist'));
    }
    done(null);
  });
};

/**
 * Test `oauth.getUser(username, password)`.
 */
module.exports.getUser = function(done) {
  const user = testParams.user.user;
  testModel.getUser(user.email, user.password, function(err, user) {
    if (err) {
      return void done(err);
    } else if (!user || !user.userId || (typeof(user.userId) !== 'string')) {
      return void done(Error('Cannot get user'));
    }
    done(null);
  });
};

/**
 * Test `oauth.getUser(username, password)` with wrong user name.
 */
module.exports.getUserWrong = function(done) {
  const user = testParams.user.user;
  testModel.getUser(user.email + '1', user.password, function(err, user) {
    if (err) {
      return void done(err);
    } else if (user) {
      return void done(Error('Get user who does not exist'));
    }
    done(null);
  });
};

/**
 * Test `oauth.getUser(username, password)` with wrong password.
 */
module.exports.getUserWrongPass = function(done) {
  const user = testParams.user.user;
  testModel.getUser(user.email, user.password + '1', function(err, user) {
    if (err) {
      return void done(err);
    } else if (user) {
      return void done(Error('Get user who does not exist'));
    }
    done(null);
  });
};

/**
 * Test `oauth.getUser(username, password)` for disabled user.
 */
module.exports.getUserDisabled = function(done) {
  const user = testParams.user.disabled;
  testModel.getUser(user.email, user.password + '1', function(err, user) {
    if (err) {
      return void done(err);
    } else if (user) {
      return void done(Error('Get user who is disabled'));
    }
    done(null);
  });
};

/**
 * Test `oauth.getUserFromClient(client, password)`.
 */
module.exports.getUserFromClient = function(done) {
  const client = {
    id: testParams.client.all.id
  };
  testModel.getUserFromClient(client, function(err, user) {
    if (err) {
      return void done(err);
    } else if (!user || !user.userId || (typeof(user.userId) !== 'string')) {
      return void done(Error('Cannot get user'));
    }
    done(null);
  });
};

/**
 * Test `oauth.getUserFromClient(client, password)` with wrong client ID.
 */
module.exports.getUserFromClientWrong = function(done) {
  const client = {
    id: testParams.client.all.id + '1'
  };
  testModel.getUserFromClient(client, function(err, user) {
    if (err) {
      return void done(err);
    } else if (user) {
      done(Error('Get user who does not associates with the client'));
      return;
    }
    done(null);
  });
};

/**
 * Test `oauth.generateAccessToken(client, user, scope)`.
 */
module.exports.generateAccessToken = function(done) {
  testModel.generateAccessToken({}, {}, null, function(err, token) {
    if (err) {
      return void done(err);
    } else if (!token || (typeof(token) !== 'string')) {
      return void done(Error('Get token fail'));
    }
    done(null);
  });
};

/**
 * Test `oauth.generateRefreshToken(client, user, scope)`.
 */
module.exports.generateRefreshToken = function(done) {
  testModel.generateRefreshToken({}, {}, null, function(err, token) {
    if (err) {
      return void done(err);
    } else if (!token || (typeof(token) !== 'string')) {
      return void done(Error('Get token fail'));
    }
    done(null);
  });
};

/**
 * Test `oauth.generateAuthorizationCode(client, user, scope)`.
 */
module.exports.generateAuthorizationCode = function(done) {
  testModel.generateAuthorizationCode({}, {}, null, function(err, code) {
    if (err) {
      return void done(err);
    } else if (!code || (typeof(code) !== 'string')) {
      return void done(Error('Get authorization code fail'));
    }
    done(null);
  });
};

/**
 * Test `oauth.getAccessToken(accessToken)`.
 */
module.exports.getAccessToken = function(done) {
  const accessToken = testParams.token.udca.accessToken;
  testModel.getAccessToken(accessToken, function(err, token) {
    if (err) {
      return void done(err);
    } else if (!token ||
        (token.accessToken !== accessToken) ||
        !_.isEqual(token.accessTokenExpiresAt,
          testParams.token.udca.accessTokenExpiresAt) ||
        !token.client || (typeof(token.client) !== 'object') ||
        (token.client.id !== testParams.token.udca.client.id) ||
        !token.user || (typeof(token.user) !== 'object') ||
        (token.user.userId !== testParams.token.udca.user.userId)) {
      done(Error('Cannot get access token: ' + JSON.stringify(token) +
        JSON.stringify(testParams.token.udca)));
      return;
    }
    done(null);
  });
};

/**
 * Test `oauth.getAccessToken(accessToken)` with wrong token.
 */
module.exports.getAccessTokenWrong = function(done) {
  const accessToken = testParams.token.udca.accessToken;
  testModel.getAccessToken(accessToken + '1', function(err, token) {
    if (err) {
      return void done(err);
    } else if (token) {
      return void done(Error('Get access token which does not exist'));
    }
    done(null);
  });
};

/**
 * Test `oauth.getRefreshToken(refreshToken)`.
 */
module.exports.getRefreshToken = function(done) {
  const refreshToken = testParams.token.udca.refreshToken;
  testModel.getRefreshToken(refreshToken, function(err, token) {
    if (err) {
      return void done(err);
    } else if (!token ||
        (token.refreshToken !== refreshToken) ||
        !_.isEqual(token.refreshTokenExpiresAt,
          testParams.token.udca.refreshTokenExpiresAt) ||
        !token.client || (typeof(token.client) !== 'object') ||
        (token.client.id !== testParams.token.udca.client.id) ||
        !token.user || (typeof(token.user) !== 'object') ||
        (token.user.userId !== testParams.token.udca.user.userId)) {
      done(Error('Cannot get refresh token: ' + JSON.stringify(token) +
        JSON.stringify(testParams.token.udca)));
      return;
    }
    done(null);
  });
};

/**
 * Test `oauth.getRefreshToken(refreshToken)` with wrong token.
 */
module.exports.getRefreshTokenWrong = function(done) {
  const refreshToken = testParams.token.udca.refreshToken;
  testModel.getRefreshToken(refreshToken + '1', function(err, token) {
    if (err) {
      return void done(err);
    } else if (token) {
      return void done(Error('Get refresh token which does not exist'));
    }
    done(null);
  });
};

/**
 * Test `oauth.getAuthorizationCode(authorizationCode)`.
 */
module.exports.getAuthorizationCode = function(done) {
  const authCode = testParams.authCode.udca.code;
  testModel.getAuthorizationCode(authCode, function(err, code) {
    if (err) {
      return void done(err);
    } else if (!code || (code.code !== testParams.authCode.udca.code) ||
        !_.isEqual(code.expiresAt, testParams.authCode.udca.expiresAt) ||
        !code.client || (typeof(code.client) !== 'object') ||
        (code.client.id !== testParams.authCode.udca.client.id) ||
        !code.user || (typeof(code.user) !== 'object') ||
        (code.user.userId !== testParams.authCode.udca.user.userId)) {
      done(Error('Cannot get authorization code: ' + JSON.stringify(code) +
        JSON.stringify(testParams.authCode.udca)));
      return;
    }
    done(null);
  });
};

/**
 * Test `oauth.getAuthorizationCode(authorizationCode)` with wrong code.
 */
module.exports.getAuthorizationCodeWrong = function(done) {
  const authCode = testParams.authCode.udca.code;
  testModel.getAuthorizationCode(authCode + '1', function(err, token) {
    if (err) {
      return void done(err);
    } else if (token) {
      return void done(Error('Get authorization code which does not exist'));
    }
    done(null);
  });
};

/**
 * Test `oauth.saveToken(token, client, user)`.
 */
module.exports.saveToken = function(done, noScope) {
  const t = {
    accessToken: testParams.token.udca.accessToken + '1',
    accessTokenExpiresAt: testParams.token.udca.accessTokenExpiresAt,
    refreshToken: testParams.token.udca.refreshToken + '1',
    refreshTokenExpiresAt: testParams.token.udca.refreshTokenExpiresAt,
    scope: testParams.token.udca.scope
  };
  if (noScope) {
    t.accessToken = testParams.token.udca.accessToken + '2';
    t.refreshToken = testParams.token.udca.refreshToken + '2';
    delete t.scope;
  }
  const client = testParams.token.udca.client;
  const user = testParams.token.udca.user;

  async.waterfall([
    // Save token.
    function(cb) {
      testModel.saveToken(t, client, user, function(err, token) {
        if (err) {
          return void cb(err);
        } else if (!token ||
            (token.accessToken !== t.accessToken) ||
            !_.isEqual(token.accessTokenExpiresAt, t.accessTokenExpiresAt) ||
            (token.refreshToken !== t.refreshToken) ||
            !_.isEqual(token.refreshTokenExpiresAt, t.refreshTokenExpiresAt) ||
            (token.scope !== t.scope) ||
            !token.client || (typeof(token.client) !== 'object') ||
            (token.client.id !== client.id) ||
            !token.user || (typeof(token.user) !== 'object') ||
            (token.user.userId !== user.userId)) {
          return void cb(Error('Cannot save token: ' + JSON.stringify(token) +
            JSON.stringify(t)));
        }
        cb(null);
      });
    },
    // Get access token to check.
    function(cb) {
      testModel.getAccessToken(t.accessToken, function(err, token) {
        if (err) {
          return void cb(err);
        } else if (!token ||
            (token.accessToken !== t.accessToken) ||
            !_.isEqual(token.accessTokenExpiresAt, t.accessTokenExpiresAt) ||
            (token.scope !== t.scope) ||
            !token.client || (typeof(token.client) !== 'object') ||
            (token.client.id !== client.id) ||
            !token.user || (typeof(token.user) !== 'object') ||
            (token.user.userId !== user.userId)) {
          return void cb(Error('Cannot save token: ' + JSON.stringify(token) +
            JSON.stringify(t)));
        }
        cb(null);
      });
    },
    // Get refresh token to check.
    function(cb) {
      testModel.getRefreshToken(t.refreshToken, function(err, token) {
        if (err) {
          return void cb(err);
        } else if (!token ||
            (token.refreshToken !== t.refreshToken) ||
            !_.isEqual(token.refreshTokenExpiresAt, t.refreshTokenExpiresAt) ||
            (token.scope !== t.scope) ||
            !token.client || (typeof(token.client) !== 'object') ||
            (token.client.id !== client.id) ||
            !token.user || (typeof(token.user) !== 'object') ||
            (token.user.userId !== user.userId)) {
          return void cb(Error('Cannot save token: ' + JSON.stringify(token) +
            JSON.stringify(t)));
        }
        cb(null);
      });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * Test `oauth.saveToken(token, client, user)` without scope.
 */
module.exports.saveTokenNoScope = function(done) {
  module.exports.saveToken(done, true);
};

/**
 * Test `oauth.saveAuthorizationCode(code, client, user)`.
 */
module.exports.saveAuthorizationCode = function(done, noScope) {
  const c = {
    authorizationCode: testParams.authCode.udca.code + '1',
    expiresAt: testParams.authCode.udca.expiresAt,
    redirectUri: testParams.authCode.udca.redirectUri + '1',
    scope: testParams.token.udca.scope
  };
  if (noScope) {
    c.authorizationCode = testParams.authCode.udca.code + '2';
    delete c.scope;
  }
  const client = testParams.token.udca.client;
  const user = testParams.token.udca.user;

  async.waterfall([
    // Save token.
    function(cb) {
      const f = testModel.saveAuthorizationCode;
      f(c, client, user, function(err, code) {
        if (err) {
          return void cb(err);
        } else if (!code || (code.authorizationCode !== c.authorizationCode) ||
            !_.isEqual(code.expiresAt, c.expiresAt) ||
            (code.redirectUri !== c.redirectUri) ||
            (code.scope !== c.scope) ||
            !code.client || (typeof(code.client) !== 'object') ||
            (code.client.id !== client.id) ||
            !code.user || (typeof(code.user) !== 'object') ||
            (code.user.userId !== user.userId)) {
          return void cb(Error('Cannot save authorization code: ' +
            JSON.stringify(code) + JSON.stringify(c)));
        }
        cb(null);
      });
    },
    // Get authorization code to check.
    function(cb) {
      const f = testModel.getAuthorizationCode;
      f(c.authorizationCode, function(err, code) {
        if (err) {
          return void cb(err);
        } else if (!code || (code.code !== c.authorizationCode) ||
            !_.isEqual(code.expiresAt, c.expiresAt) ||
            (code.scope !== c.scope) ||
            !code.client || (typeof(code.client) !== 'object') ||
            (code.client.id !== client.id) ||
            !code.user || (typeof(code.user) !== 'object') ||
            (code.user.userId !== user.userId)) {
          return void cb(Error('Cannot save authorization code: ' +
            JSON.stringify(code) + JSON.stringify(c)));
        }
        cb(null);
      });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * Test `oauth.saveAuthorizationCode(code, client, user)` without scope.
 */
module.exports.saveAuthorizationCodeNoScope = function(done) {
  module.exports.saveAuthorizationCode(done, true);
};

/**
 * Test `oauth.validateScope(user, client, scope)`.
 */
module.exports.validateScope = function(done) {
  const u = testParams.user.dev;
  const c = testParams.client.all;
  const s = c.scopes[0];
  testModel.validateScope(u, c, s, function(err, scopes) {
    if (err) {
      return void done(err);
    }
    done(scopes ? null : Error('Validate scope fail'));
  });
};

/**
 * Test `oauth.validateScope(user, client, scope)` without scope.
 */
module.exports.validateScopeNoScope = function(done) {
  const u = testParams.user.dev;
  const c = testParams.client.all;
  testModel.validateScope(u, c, undefined, function(err, scopes) {
    if (err) {
      return void done(err);
    }
    done(scopes ? Error('Should not validate without scope') : null);
  });
};

/**
 * Test `oauth.validateScope(user, client, scope)` with invalid scope.
 */
module.exports.validateScopeInvalidScope = function(done) {
  const u = testParams.user.dev;
  const c = testParams.client.all;
  const s = c.scopes[0] + '1';
  testModel.validateScope(u, c, s, function(err, scopes) {
    if (err) {
      return void done(err);
    }
    done(scopes ? Error('Should not validate invalid scope') : null);
  });
};

/**
 * Test `oauth.verifyScope(token, scope)`.
 */
module.exports.verifyScope = function(done) {
  const token = testParams.token.udca;
  const scope = testParams.token.udca.scope;
  testModel.verifyScope(token, scope, function(err, success) {
    if (err) {
      return void done(err);
    }
    done(success ? null : Error('Verify scope fail'));
  });
};

/**
 * Test `oauth.verifyScope(token, scope)` without scope.
 */
module.exports.verifyScopeNoScope = function(done) {
  const token = {
    accessToken: testParams.token.udca.accessToken,
    accessTokenExpiresAt: testParams.token.udca.accessTokenExpiresAt,
    client: testParams.token.udca.client,
    user: testParams.user.user
  };
  const scope = testParams.token.udca.scope;
  testModel.verifyScope(token, scope, function(err, success) {
    if (err) {
      return void done(err);
    }
    done(success ? Error('Should not verify successfully') : null);
  });
};

/**
 * Test `oauth.revokeToken(token)`.
 */
module.exports.revokeToken = function(done) {
  const token = { refreshToken: testParams.token.udca.refreshToken };

  async.waterfall([
    // Revoke token.
    function(cb) {
      testModel.revokeToken(token, function(err, success) {
        if (err) {
          return void cb(err);
        }
        cb(success ? null : Error('Cannot revoke token'));
      });
    },
    // Check if the token is not exist.
    function(cb) {
      testModel.getRefreshToken(token.refreshToken, function(err, token) {
        if (err) {
          return void cb(err);
        }
        cb(token ? Error('Revoke token fail') : null);
      });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * Test `oauth.revokeAuthorizationCode(code)`.
 */
module.exports.revokeAuthorizationCode = function(done) {
  const code = { code: testParams.authCode.udca.code };

  async.waterfall([
    // Revoke authorization code.
    function(cb) {
      testModel.revokeAuthorizationCode(code, function(err, success) {
        if (err) {
          return void cb(err);
        }
        cb(success ? null : Error('Cannot revoke authorization code'));
      });
    },
    // Check if the authorization code is not exist.
    function(cb) {
      testModel.getAuthorizationCode(code.code, function(err, code) {
        if (err) {
          return void cb(err);
        }
        cb(code ? Error('Revoke authorization code fail') : null);
      });
    }
  ], function(err) {
    done(err);
  });
};
