'use strict';

const stdio  = require('stdio');
const common = require('./common');
const config = require('./config');

const ops = stdio.getopt({
  id:     { key: 'i', args: 1, description: 'Client ID' },
  secret: { key: 'S', args: 1, description: 'Client secret' },
  uris:   { key: 'u', args: '*', description: 'Redirect URIs' },
  scopes: { key: 's', args: '*', description: 'Scopes' },
  name:   { key: 'n', args: 1, description: 'Display name' },
  image:  { key: 'I', args: 1, description: 'Image URL' }
}, 'node api-client-update [OPTIONS]');

// Post process arguments.
if (ops.secret) {
  ops.clientSecret = ops.secret;
  delete ops.secret;
}
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

let opts = {
  method: 'PUT',
  url: `${config.hosts.oauth2}/api/client/${ops.id}`,
  body: ops
};
delete ops.id;
common.sendApi(opts, (err, body) => {
  if (err instanceof Error) {
    return void console.log(`[ERR] ${err.message}`);
  } else if (err) {
    return void console.log(`[ERR] ${JSON.stringify(err, null, '  ')}`);
  }
  console.log('[OK] Client information update success');
});
