'use strict';

const stdio  = require('stdio');
const common = require('./common');
const config = require('./config');

const ops = stdio.getopt({
  uris:   { key: 'u', args: '*', description: 'Redirect URIs' },
  scopes: { key: 's', args: '*', description: 'Scopes' },
  grants: { key: 'g', args: '*', description: 'Support grants' },
  user:   { key: 'U', args: 1, description: 'User ID' },
  name:   { key: 'n', args: 1, description: 'Display name' },
  image:  { key: 'I', args: 1, description: 'Image URL' }
}, 'node api-client-add [OPTIONS]');

// Post process arguments.
if (ops.uris) {
  ops.redirectUris = (typeof(ops.uris) === 'string') ? [ ops.uris ] : ops.uris;
  delete ops.uris;
} else {
  ops.redirectUris = [];
}
if (ops.scopes) {
  if (typeof(ops.scopes) === 'string') {
    ops.scopes = [ ops.scopes ];
  }
} else {
  ops.scopes = [];
}
if (ops.grants) {
  if (typeof(ops.grants) === 'string') {
    ops.grants = [ ops.grants ];
  }
} else {
  ops.grants = [];
}
if (ops.user) {
  ops.userId = ops.user;
  delete ops.user;
}

let opts = {
  method: 'POST',
  url: `${config.hosts.oauth2}/api/client`,
  body: ops
};
common.sendApi(opts, (err, body) => {
  if (err instanceof Error) {
    return void console.log(`[ERR] ${err.message}`);
  } else if (err) {
    return void console.log(`[ERR] ${JSON.stringify(err, null, '  ')}`);
  }
  console.log(`[OK] Client is added with ID: ${body.clientId}`);
});
