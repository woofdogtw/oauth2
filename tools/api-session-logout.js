'use strict';

// 3rd party modules.
const async   = require('async');
const request = require('request');
const stdio   = require('stdio');

const config = require('./config');

const ops = stdio.getopt({
  token: { key: 't', args: 1, description: 'Access token', mandatory: true }
}, 'node api-session-logout [OPTIONS]');

async.waterfall([
  // Send API.
  function(cb) {
    const opts = {
      url: `${config.hosts.oauth2}/api/session/logout`,
      headers: { Authorization: `Bearer ${ops.token}` },
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
      cb(null);
    });
  }
], (err) => {
  if (err) {
    return void console.log(`[ERR] ${err.message}`);
  }
  console.log('[OK]');
});
