'use strict';

const stdio  = require('stdio');
const common = require('./common');
const config = require('./config');

const ops = stdio.getopt({
  user: { key: 'u', args: 1, description: 'User ID' }
}, 'node api-client-count [OPTIONS]');

let opts = {
  method: 'GET',
  url: `${config.hosts.oauth2}/api/client/count`,
  qs: ops
};
common.sendApi(opts, (err, body) => {
  if (err instanceof Error) {
    return void console.log(`[ERR] ${err.message}`);
  } else if (err) {
    return void console.log(`[ERR] ${JSON.stringify(err, null, '  ')}`);
  }
  console.log(`[OK] Client count: ${body.count}`);
});
