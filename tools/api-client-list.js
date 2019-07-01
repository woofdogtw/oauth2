'use strict';

const stdio  = require('stdio');
const common = require('./common');
const config = require('./config');

const ops = stdio.getopt({
  num:  { key: 'n', args: 1, description: 'Number of items in a page' },
  p:    { key: 'p', args: 1, description: 'Page' },
  user: { key: 'u', args: 1, description: 'User ID' }
}, 'node api-client-list [OPTIONS]');

let opts = {
  method: 'GET',
  url: `${config.hosts.oauth2}/api/client/list`,
  qs: ops
};
common.sendApi(opts, (err, body) => {
  if (err instanceof Error) {
    return void console.log(`[ERR] ${err.message}`);
  } else if (err) {
    return void console.log(`[ERR] ${JSON.stringify(err, null, '  ')}`);
  }
  console.log(`[OK] Client list: ${JSON.stringify(body, null, '  ')}`);
});
