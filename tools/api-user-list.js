'use strict';

const stdio  = require('stdio');
const common = require('./common');
const config = require('./config');

const ops = stdio.getopt({
  num:      { key: 'n', args: 1, description: 'Number of items in a page' },
  p:        { key: 'p', args: 1, description: 'Page' },
  contains: { key: 'c', args: 1, description: 'Contains partial word' },
  fields:   { key: 'f', args: '*', description: 'Display fields' },
  sort:     { key: 's', args: '*', description: 'Sort with [key:<asc|desc>]' }
}, 'node api-user-list [OPTIONS]');

// Post process arguments.
if (ops.fields) {
  ops.fields = ops.fields.toString();
}
if (ops.sort) {
  ops.sort = ops.sort.toString();
}

let opts = {
  method: 'GET',
  url: `${config.hosts.oauth2}/api/user/list`,
  qs: ops
};
common.sendApi(opts, (err, body) => {
  if (err instanceof Error) {
    return void console.log(`[ERR] ${err.message}`);
  } else if (err) {
    return void console.log(`[ERR] ${JSON.stringify(err, null, '  ')}`);
  }
  console.log(`[OK] User list: ${JSON.stringify(body, null, '  ')}`);
});
