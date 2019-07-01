'use strict';

require('json5/lib/register');

if (process.env.NODE_ENV == 'production') {
  module.exports = require('./production.json5');
} else if (process.env.NODE_ENV == 'test') {
  module.exports = require('./test.json5');
} else {
  module.exports = require('./development.json5');
}
