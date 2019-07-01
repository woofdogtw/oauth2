'use strict';

const async = require('async');

const config     = require('../../configs/oauth2');
const testParams = require('../test-params');
const models     = require('./models');
const routes     = require('./routes');

describe('unit.mongodb', function() {
  before(initFunc);

  describe('models', function() {
    before(dataInitFunc);

    // Test the OAuth2Server model functions.
    describe('models.oauth2', function() {
      it('getClient()', models.oauth.getClient);
      it('getClient() without secret', models.oauth.getClientNoSecret);
      it('getClient() without authorization_code support',
        models.oauth.getClientNoAuthCode);
      it('getClient() with wrong client ID', models.oauth.getClientWrong);
      it('getUser()', models.oauth.getUser);
      it('getUser() with wrong user name', models.oauth.getUserWrong);
      it('getUser() with wrong user password', models.oauth.getUserWrongPass);
      it('getUser() for disabled user', models.oauth.getUserDisabled);
      it('getUserFromClient()', models.oauth.getUserFromClient);
      it('getUserFromClient() with wrong client ID',
        models.oauth.getUserFromClientWrong);
      it('generateAccessToken()', models.oauth.generateAccessToken);
      it('generateRefreshToken()', models.oauth.generateRefreshToken);
      it('generateAuthorizationCode()', models.oauth.generateAuthorizationCode);
      it('getAccessToken()', models.oauth.getAccessToken);
      it('getAccessToken() with wrong token', models.oauth.getAccessTokenWrong);
      it('getRefreshToken()', models.oauth.getRefreshToken);
      it('getRefreshToken() with wrong token',
        models.oauth.getRefreshTokenWrong);
      it('getAuthorizationCode()', models.oauth.getAuthorizationCode);
      it('getAuthorizationCode() with wrong token',
        models.oauth.getAuthorizationCodeWrong);
      it('saveToken()', models.oauth.saveToken);
      it('saveToken() without scope', models.oauth.saveTokenNoScope);
      it('saveAuthorizationCode()', models.oauth.saveAuthorizationCode);
      it('saveAuthorizationCode() without scope',
        models.oauth.saveAuthorizationCodeNoScope);
      it('validateScope()', models.oauth.validateScope);
      it('validateScope() without scope', models.oauth.validateScopeNoScope);
      it('validateScope() with invalid scope',
        models.oauth.validateScopeInvalidScope);
      it('verifyScope()', models.oauth.verifyScope);
      it('verifyScope() without scope', models.oauth.verifyScopeNoScope);
      it('revokeToken()', models.oauth.revokeToken);
      it('revokeAuthorizationCode()', models.oauth.revokeAuthorizationCode);
    });

    // Test the user model CRUD functions.
    describe('models.user', function() {
      it('getUser() without options', models.user.getUser);
      it('getUser() with options', models.user.getUserOpts);
      it('getUser() with wrong user ID', models.user.getUserWrong);
      it('getUser() with invalid parameters', models.user.getUserInvalid);
      it('addUser() with complete info', models.user.addUser);
      it('addUser() using default info', models.user.addUserDefault);
      it('addUser() with invalid parameters', models.user.addUserInvalid);
      it('rmUser()', models.user.rmUser);
      it('rmUser() with invalid user ID', models.user.rmUserInvalidId);
      it('updateUser()', models.user.updateUser);
      it('updateUser() with invalid user ID', models.user.updateUserInvalidId);
      it('updateUser() with invalid parameters', models.user.updateUserInvalid);
      it('getUserCount() without options', models.user.getUserCount);
      it('getUserCount() with conditions', models.user.getUserCountCond);
      it('getUserList() with specified email', models.user.getUserListEmail);
      it('getUserList() sorting', models.user.getUserListSort);
      it('getUserList() paging', models.user.getUserListPage);
    });

    // Test the client model CRUD functions.
    describe('models.client', function() {
      it('getClient() without options', models.client.getClient);
      it('getClient() with options', models.client.getClientOpts);
      it('getClient() with wrong user ID', models.client.getClientWrong);
      it('getClient() with invalid parameters', models.client.getClientInvalid);
      it('addClient() with complete info', models.client.addClient);
      it('addClient() with default info', models.client.addClientDefault);
      it('addClient() with invalid parameters', models.client.addClientInvalid);
      it('rmClient()', models.client.rmClient);
      it('rmClient() with invalid client ID', models.client.rmClientInvalidId);
      it('updateClient()', models.client.updateClient);
      it('updateClient() with invalid client ID',
        models.client.updateClientInvalidId);
      it('updateClient() with invalid parameters',
        models.client.updateClientInvalid);
      it('getClientCount() without options', models.client.getClientCount);
      it('getClientCount() with conditions', models.client.getClientCountCond);
      it('getClientList() sorting', models.client.getClientListSort);
      it('getClientList() paging', models.client.getClientListPage);
      it('rmClientUser()', models.client.rmClientUser);
      it('rmClientUser() with invalid user ID',
        models.client.rmClientUserInvalidId);
    });

    // Test the token model CRUD functions.
    describe('models.token', function() {
      it('rmAccessToken()', models.token.rmAccessToken);
    });

    after(dataRemoveFunc);
  });

  describe('routes', function() {
    if (config.oauth2.db.engine !== 'mongodb') {
      return;
    }

    // Test general request errors.
    describe('routes.errors',function() {
      it('Check non-exist API', routes.error.wrongApi);
      it('Check JSON format error', routes.error.json);
    });

    // Test the OAuth2Server routes.
    describe('routes.oauth2', function() {
      before(dataInitFunc);

      it('GET /oauth2/login', routes.oauth.invalidGetLogin);
      it('POST /oauth2/login', routes.oauth.invalidPostLogin);
      it('POST /oauth2/login for disabled user',
        routes.oauth.disabledPostLogin);
      it('GET /oauth2/grant', routes.oauth.invalidGetGrant);
      it('GET /oauth2/grant with wrong state', routes.oauth.errorGetGrant);
      it('authorization_code grant flow', routes.oauth.authorizationCode);
      it('authorization_code grant flow without required parameters',
        routes.oauth.authorizationCodeNoParams);
      it('authorization_code grant flow with invalid parameters',
        routes.oauth.authorizationCodeInvalid);
      it('password grant flow', routes.oauth.passwordCredentials);
      it('client_credentials grant flow', routes.oauth.clientCredentials);

      after(dataRemoveFunc);
    });

    // Test session APIs.
    describe('routes.session', function() {
      before(dataInitFunc);

      it('POST /api/session/login', routes.session.login);
      it('POST /api/session/login with wrong user name or password',
        routes.session.loginWrong);
      it('POST /api/session/logout', routes.session.logout);
      it('POST /api/session/logout with invalid parameters',
        routes.session.logoutInvalid);
      it('POST /api/session/refresh', routes.session.refresh);
      it('POST /api/session/refresh with invalid parameters',
        routes.session.refreshInvalid);

      after(dataRemoveFunc);
    });

    // Test user information APIs.
    describe('routes.user', function() {
      before(dataInitFunc);

      it('GET /api/user', routes.user.getUser);
      it('GET /api/user with normal user', routes.user.getUserNormal);
      it('GET /api/user with wrong token', routes.user.getUserWrongToken);
      it('PUT /api/user', routes.user.putUser);
      it('PUT /api/user with invalid parameters', routes.user.putUserInvalid);

      after(dataRemoveFunc);
    });

    // Test user administration APIs.
    describe('routes.admin', function() {
      before(dataInitFunc);

      it('GET /api/user/{userId}', routes.admin.getUser);
      it('GET /api/user/{userId} with non-exist user ID',
        routes.admin.getUserNotExist);
      it('GET /api/user/{userId} with invalid user',
        routes.admin.getUserInvalidPerm);
      it('POST /api/user', routes.admin.postUser);
      it('POST /api/user with registered email', routes.admin.postUserExist);
      it('POST /api/user with invalid parameters',
        routes.admin.postUserInvalid);
      it('POST /api/user with invalid user', routes.admin.postUserInvalidPerm);
      it('DELETE /api/user/{userId}', routes.admin.deleteUser);
      it('DELETE /api/user/{userId} with non-exist user ID',
        routes.admin.deleteUserNotExist);
      it('DELETE /api/user/{userId} with invalid user',
        routes.admin.deleteUserInvalidPerm);
      it('PUT /api/user/{userId}', routes.admin.putUser);
      it('PUT /api/user/{userId} with non-exist user ID',
        routes.admin.putUserNotExist);
      it('PUT /api/user/{userId} with invalid parameters',
        routes.admin.putUserInvalid);
      it('PUT /api/user/{userId} with invalid user',
        routes.admin.putUserInvalidPerm);
      it('GET /api/user/count without options', routes.admin.getUserCount);
      it('GET /api/user/count with options', routes.admin.getUserCountCond);
      it('GET /api/user/count with invalid user',
        routes.admin.getUserCountInvalidPerm);
      it('GET /api/user/list with sorting', routes.admin.getUserListSort);
      it('GET /api/user/list with paging', routes.admin.getUserListPage);
      it('GET /api/user/list with invalid parameters',
        routes.admin.getUserListInvalid);
      it('GET /api/user/list with invalid user',
        routes.admin.getUserListInvalidPerm);

      after(dataRemoveFunc);
    });

    // Test client administration APIs.
    describe('routes.client', function() {
      before(dataInitFunc);

      it('GET /api/client/{clientId} with dev user',
        routes.client.getClientDev);
      it('GET /api/client/{clientId} with admin user',
        routes.client.getClientAdmin);
      it('GET /api/client/{clientId} with wrong dev user',
        routes.client.getClientDevWrong);
      it('GET /api/client/{clientId} with wrong client ID',
        routes.client.getClientWrong);
      it('GET /api/client/{clientId} with invalid user',
        routes.client.getClientInvalidPerm);
      it('POST /api/client by dev user', routes.client.postClientDev);
      it('POST /api/client by admin user', routes.client.postClientAdmin);
      it('POST /api/client with invalid parameters',
        routes.client.postClientInvalid);
      it('POST /api/client with invalid user',
        routes.client.postClientInvalidPerm);
      it('DELETE /api/client/{clientId} with dev user',
        routes.client.deleteClientDev);
      it('DELETE /api/client/{clientId} with wrong dev user',
        routes.client.deleteClientDevWrong);
      it('DELETE /api/client/{clientId} with non-exist client ID',
        routes.client.deleteClientNotExist);
      it('DELETE /api/client/{clientId} with invalid user',
        routes.client.deleteClientInvalidPerm);
      it('PUT /api/client/{clientId} with dev user',
        routes.client.putClientDev);
      it('PUT /api/client/{clientId} with wrong dev user',
        routes.client.putClientDevWrong);
      it('PUT /api/client/{clientId} with non-exist client ID',
        routes.client.putClientNotExist);
      it('PUT /api/client/{clientId} with invalid parameters',
        routes.client.putClientInvalid);
      it('PUT /api/client/{clientId} with invalid user',
        routes.client.putClientInvalidPerm);
      it('GET /api/client/count with dev user',
        routes.client.getClientCountDev);
      it('GET /api/client/count with admin user',
        routes.client.getClientCountAdmin);
      it('GET /api/client/count with options with admin user',
        routes.client.getClientCountCond);
      it('GET /api/client/count with non-exist user ID',
        routes.client.getClientCountNotExist);
      it('GET /api/client/count with invalid user',
        routes.client.getClientCountInvalidPerm);
      it('GET /api/client/list with sorting', routes.client.getClientListSort);
      it('GET /api/client/list with paging', routes.client.getClientListPage);
      it('GET /api/client/list with invalid parameters',
        routes.client.getClientListInvalid);
      it('GET /api/client/list with invalid user',
        routes.client.getClientListInvalidPerm);
      it('DELETE /api/client/user/{userId}', routes.client.deleteClientUser);
      it('DELETE /api/client/user/{userId} with non-exist user ID',
        routes.client.deleteClientUserNotExist);
      it('DELETE /api/client/user/{userId} with invalid user',
        routes.client.deleteClientUserInvalidPerm);

      after(dataRemoveFunc);
    });
  });

  after(exitFunc);
});

/**
 * Initialize the unit test environment by
 * - Establishing DB connection (for generating data for tests)
 * - Launching the App server for RESTful API testing
 */
function initFunc(done) {
  let model;

  async.waterfall([
    // Connect database.
    function(cb) {
      model = require('../../models/oauth2-mongodb');
      const dbConn = require('../../models/oauth2-mongodb/connection');
      dbConn.on('connect', function() {
        models.init(model);
        cb(null);
      });
    },
    // Clear data before all testing.
    function(cb) {
      dataRemoveFunc(function(err) {
        cb(err);
      });
    },
    // Connect to the server.
    function(cb) {
      if (config.oauth2.db.engine === 'mongodb') {
        routes.init(require('../../oauth2').app);
      }
      cb(null);
    }
  ], function(err) {
    done(err);
  });
}

/**
 * Close DB connection and App server, then delete the DB file.
 */
function exitFunc(done) {
  const conn = require('../../models/oauth2-mongodb/connection');

  conn.connection.dropDatabase(function() {
    if (config.oauth2.db.engine === 'mongodb') {
      let { http, https } = require('../../oauth2');
      http && http.close();
      https && https.close();
    }
    conn.close(function() {
      done(null);
    });
  });
}

/**
 * Insert data for the following unit testing. Call this before all test suites.
 */
function dataInitFunc(done) {
  const db = require('../../models/oauth2-mongodb/connection').connection;

  async.waterfall([
    // Create user.
    function(cb) {
      initUser(db, cb);
    },
    // Create client.
    function(cb) {
      initClient(db, cb);
    },
    // Create tokens.
    function(cb) {
      initToken(db, cb);
    },
    // Create authorization code.
    function(cb) {
      initAuthCode(db, cb);
    }
  ], function(err) {
    done(err);
  });
}

/**
 * Clear data for remaining unit testing. Call this after all test suites.
 */
function dataRemoveFunc(done) {
  const db = require('../../models/oauth2-mongodb/connection').connection;

  async.waterfall([
    // Remove user.
    function(cb) {
      db.dropCollection('user', (err) => { cb(); });
    },
    // Remove client.
    function(cb) {
      db.dropCollection('client', (err) => { cb(); });
    },
    // Remove token.
    function(cb) {
      db.dropCollection('token', (err) => { cb(); });
    },
    // Remove authorization code.
    function(cb) {
      db.dropCollection('authCode', (err) => { cb(); });
    }
  ], function(err) {
    done(err);
  });
}

function initUser(db, callback) {
  const users = [ 'user', 'admin', 'manager', 'dev', 'dev2', 'disabled' ];
  let index = 0;
  (function insert() {
    if (index >= users.length) {
      return callback(null);
    }
    const user = testParams.user[users[index]];
    const doc = {
      userId: user.userId,
      email: user.email,
      created: user.created,
      validated: user.validated,
      expired: user.expired,
      disabled: user.disabled,
      roles: user.roles,
      password: models.getHash(user.password, 'salt'),
      salt: 'salt',
      name: user.name,
      info: user.info
    };
    db.collection('user').insertOne(doc, (err) => {
      if (err) {
        return callback(err);
      }
      index++;
      insert();
    });
  })();
}

function initClient(db, callback) {
  const clients = [ 'all', 'noAuthCode' ];
  let index = 0;
  (function insert() {
    if (index >= clients.length) {
      return callback(null);
    }
    const c = testParams.client[clients[index]];
    db.collection('client').insertOne(c, (err) => {
      if (err) {
        return callback(err);
      }
      index++;
      insert();
    });
  })();
}

function initToken(db, callback) {
  const tokens = [ 'udca', 'udca2', 'uuca', 'uaca', 'umca', 'ud2ca' ];
  let index = 0;
  (function insert() {
    if (index >= tokens.length) {
      return callback(null);
    }
    db.collection('token').insertOne(testParams.token[tokens[index]], (err) => {
      if (err) {
        return callback(err);
      }
      index++;
      insert();
    });
  })();
}

function initAuthCode(db, callback) {
  db.collection('authCode').insertOne(testParams.authCode.udca, (err) => {
    callback(err);
  });
}
