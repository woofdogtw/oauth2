'use strict';

const stdio  = require('stdio');
const common = require('./common');
const config = require('./config');

const ops = stdio.getopt({
  id: { key: 'i', args: 1, description: 'User ID', madatory: true }
}, 'node api-user-delete [OPTIONS]');

let opts = {
  method: 'DELETE',
  url: `${config.hosts.oauth2}/api/user/${ops.id}`
};
common.sendApi(opts, (err, body) => {
  if (err instanceof Error) {
    return void console.log(`[ERR] ${err.message}`);
  } else if (err) {
    return void console.log(`[ERR] ${JSON.stringify(err, null, '  ')}`);
  }
  console.log('[OK] User is deleted');
});
