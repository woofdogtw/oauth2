'use strict';

const async = require('async');

const testParams = require('../../test-params');
let testModel;
let oauthModel;

/**
 * Initialize model object. Call this before all test.
 *
 * @param {Object} model The model object to be used.
 */
module.exports.init = function(model) {
  testModel = model.token;
  oauthModel = model.oauth;
};

/**
 * Test `token.rmAccessToken(accessToken)`.
 */
module.exports.rmAccessToken = function(done) {
  const token = testParams.token.udca2.accessToken;

  async.waterfall([
    // Revoke token.
    function(cb) {
      testModel.rmAccessToken(token, function(err) {
        cb(err);
      });
    },
    // Check if the token is not exist.
    function(cb) {
      oauthModel.getAccessToken(token, function(err, token) {
        if (err) {
          return void cb(err);
        }
        cb(token ? Error('Remove access token fail') : null);
      });
    }
  ], function(err) {
    done(err);
  });
};
