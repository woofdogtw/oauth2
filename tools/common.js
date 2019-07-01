'use strict';

// Node.js modules.
const fs   = require('fs');
const path = require('path');

// 3rd party modules.
const async   = require('async');
const request = require('request');
const stdio   = require('stdio');

const config = require('./config');

/**
 * Send API and response body.
 *
 * This method helps you to process token procedures.
 *
 * @param {Object} opts The options of `request`.
 *   @param {string} opts.method
 *   @param {string} opts.url
 *   @param {string} [opts.body]
 * @param {function} callback
 *   @param {?Error} callback.err
 *   @param {?Object} callback.body The HTTP response body.
 */
module.exports.sendApi = (opts, callback) => {
  async.waterfall([
    // Fetch access token first.
    function(cb) {
      getToken(cb);
    },
    // Send API.
    function(cb) {
      if (!opts.headers) {
        opts.headers = {};
      }
      opts.headers.Authorization = `Bearer ${config.accessToken}`;
      opts.json = true;
      opts.rejectUnauthorized = false;
      request(opts, (err, resp, body) => {
        if (err) {
          return void cb(err);
        } else if (resp.statusCode === 401) {
          refreshToken((err) => {
            if (err) {
              return void cb(err);
            }
            process.nextTick(() => { module.exports.sendApi(opts, callback); });
          });
          return;
        } else if (resp.statusCode !== 200) {
          return void cb(body);
        }
        cb(null, body);
      });
    }
  ], (err, body) => {
    callback(err, body);
  });
};

/**
 * Get access token in the config module.
 *
 * @param {function} callback
 *   @param {?Error} callback.err
 */
function getToken(callback) {
  async.waterfall([
    // Check user name and password.
    function(cb) {
      if (config.username && config.password) {
        return void cb(null);
      }
      let username;
      const askName = () => {
        stdio.question('User name', (err, name) => {
          if (err || !name) {
            return void process.nextTick(askName);
          }
          username = name;
          askPass();
        });
      };
      const askPass = () => {
        stdio.question('password', (err, pass) => {
          if (err || !pass) {
            return void process.nextTick(askPass);
          }
          config.username = username;
          config.password = pass;
          writeConfig();
          cb(null);
        });
      };
      askName();
    },
    // Send API if no access token.
    function(cb) {
      if (config.accessToken) {
        return void cb(null);
      }
      const opts = {
        url: `${config.hosts.oauth2}/api/session/login`,
        form: {
          username: config.username,
          password: config.password
        },
        json: true,
        rejectUnauthorized: false
      };
      request.post(opts, (err, resp, body) => {
        if (err) {
          return void cb(err);
        } else if (resp.statusCode !== 200) {
          if (body.code === 'ESESSION_LOGIN') {
            config.username = '';
            config.password = '';
            writeConfig();
          }
          return void cb(body);
        }
        config.accessToken = body.accessToken;
        config.refreshToken = body.refreshToken;
        writeConfig();
        cb(null);
      });
    }
  ], (err) => {
    callback(err);
  });
}

/**
 * Refresh tokens.
 *
 * @param {function} callback
 *   @param {?Error} callback.err
 */
function refreshToken(callback) {
  async.waterfall([
    // Send login if no refresh token.
    function(cb) {
      if (config.refreshToken) {
        return void cb(null);
      }
      getToken(cb);
    },
    // Send refresh API.
    function(cb) {
      const opts = {
        url: `${config.hosts.oauth2}/api/session/refresh`,
        body: { refreshToken: config.refreshToken },
        json: true
      };
      request.post(opts, (err, resp, body) => {
        if (err) {
          return void cb(err);
        } else if (resp.statusCode === 401) {
          config.username = '';
          config.password = '';
          config.accessToken = '';
          config.refreshToken = '';
          writeConfig();
          return void getToken(cb);
        } else if (resp.statusCode !== 200) {
          return void cb(body);
        }
        config.accessToken = body.accessToken;
        config.refreshToken = body.refreshToken;
        writeConfig();
        cb(null);
      });
    }
  ], (err) => {
    callback(err);
  });
}

/**
 * Write configuration.
 */
function writeConfig() {
  fs.writeFileSync(path.join(__dirname, 'config.json'),
    JSON.stringify(config, null, '  '));
}
