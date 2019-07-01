'use strict';

// 3rd party modules.
const async   = require('async');
const request = require('request');
const stdio   = require('stdio');

const config = require('./config');

const ops = stdio.getopt({
  token: { key: 't', args: 1, description: 'Refresh token', mandatory: true }
}, 'node api-session-refresh [OPTIONS]');

async.waterfall([
  // Send API.
  function(cb) {
    const opts = {
      url: `${config.hosts.oauth2}/api/session/refresh`,
      body: { refreshToken: ops.token },
      json: true,
      rejectUnauthorized: false
    };
    request.post(opts, (err, resp, body) => {
      if (err) {
        return void cb(err);
      } else if (resp.statusCode !== 200) {
        return void cb(Error(`Status ${resp.statusCode}: ` +
          `${JSON.stringify(body, null, '  ')}`));
      }
      cb(null, body);
    });
  }
], (err, result) => {
  if (err) {
    return void console.log(`[ERR] ${err.message}`);
  }
  console.log(`[OK] New tokens: ${JSON.stringify(result, null, ' ')}`);
});
