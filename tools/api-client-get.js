'use strict';

const stdio  = require('stdio');
const common = require('./common');
const config = require('./config');

const ops = stdio.getopt({
  id: { key: 'i', args: 1, description: 'Client ID', mandatory: true }
}, 'node api-client-get [OPTIONS]');

let opts = {
  method: 'GET',
  url: `${config.hosts.oauth2}/api/client/${ops.id}`
};
common.sendApi(opts, (err, body) => {
  if (err instanceof Error) {
    return void console.log(`[ERR] ${err.message}`);
  } else if (err) {
    return void console.log(`[ERR] ${JSON.stringify(err, null, '  ')}`);
  }
  console.log(`[OK] Client information: ${JSON.stringify(body, null, '  ')}`);
});
