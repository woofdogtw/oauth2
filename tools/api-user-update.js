'use strict';

const stdio  = require('stdio');
const common = require('./common');
const config = require('./config');

const ops = stdio.getopt({
  id:        { key: 'i', args: 1, description: 'User ID' },
  validated: { key: 'v', args: 1, description: 'Validation date (ISO-8601)' },
  disabled:  { key: 'd', args: 1, description: 'true|false' },
  roles:     { key: 'r', args: 1, description: 'Roles (JSON)' },
  password:  { key: 'p', args: 1, description: 'Password' },
  name:      { key: 'n', args: 1, description: 'Display name'},
  info:      { key: 'I', args: 1, description: 'Other information (JSON)' }
}, 'node api-user-update [OPTIONS]');

// Post process arguments.
if (ops.disabled) {
  ops.disabled = (ops.disabled === 'true');
}
if (ops.roles) {
  ops.roles = JSON.parse(ops.roles);
}
if (ops.info) {
  ops.info = JSON.parse(ops.info);
}

let opts = {
  method: 'PUT',
  url: `${config.hosts.oauth2}/api/user`,
  body: ops
};
if (ops.id) {
  opts.url += `/${ops.id}`;
  delete ops.id;
} else {
  delete ops.validated;
  delete ops.disabled;
  delete ops.roles;
}
common.sendApi(opts, (err, body) => {
  if (err instanceof Error) {
    return void console.log(`[ERR] ${err.message}`);
  } else if (err) {
    return void console.log(`[ERR] ${JSON.stringify(err, null, '  ')}`);
  }
  console.log('[OK] User information update success');
});
