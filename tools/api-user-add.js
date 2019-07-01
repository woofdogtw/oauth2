'use strict';

const stdio  = require('stdio');
const common = require('./common');
const config = require('./config');

const ops = stdio.getopt({
  email:    { key: 'm', args: 1, description: 'E-mail address', mandatory: true },
  password: { key: 'p', args: 1, description: 'Password', mandatory: true },
  name:     { key: 'n', args: 1, description: 'Display name' },
  info:     { key: 'I', args: 1, description: 'Other information (JSON)' }
}, 'node api-user-add [OPTIONS]');

// Post process arguments.
if (ops.info) {
  ops.info = JSON.parse(ops.info);
}

let opts = {
  method: 'POST',
  url: `${config.hosts.oauth2}/api/user`,
  body: ops
};
common.sendApi(opts, (err, body) => {
  if (err instanceof Error) {
    return void console.log(`[ERR] ${err.message}`);
  } else if (err) {
    return void console.log(`[ERR] ${JSON.stringify(err, null, '  ')}`);
  }
  console.log(`[OK] User is added with ID: ${body.userId}`);
});
