'use strict';

const stdio  = require('stdio');
const common = require('./common');
const config = require('./config');

const ops = stdio.getopt({
  contains: { key: 'c', args: 1, description: 'Contains partial word' }
}, 'node api-user-count [OPTIONS]');

let opts = {
  method: 'GET',
  url: `${config.hosts.oauth2}/api/user/count`,
  qs: ops
};
common.sendApi(opts, (err, body) => {
  if (err instanceof Error) {
    return void console.log(`[ERR] ${err.message}`);
  } else if (err) {
    return void console.log(`[ERR] ${JSON.stringify(err, null, '  ')}`);
  }
  console.log(`[OK] User count: ${body.count}`);
});
