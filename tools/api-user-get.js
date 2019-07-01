'use strict';

const stdio  = require('stdio');
const common = require('./common');
const config = require('./config');

const ops = stdio.getopt({
  id: { key: 'i', args: 1, description: 'User ID' }
}, 'node api-user-get [OPTIONS]');

let opts = {
  method: 'GET',
  url: `${config.hosts.oauth2}/api/user`
};
if (ops.id) {
  opts.url += `/${ops.id}`;
}
common.sendApi(opts, (err, body) => {
  if (err instanceof Error) {
    return void console.log(`[ERR] ${err.message}`);
  } else if (err) {
    return void console.log(`[ERR] ${JSON.stringify(err, null, '  ')}`);
  }
  console.log(`[OK] User information: ${JSON.stringify(body, null, '  ')}`);
});
