'use strict';

const log4js = require('log4js');

const category = (process.env.NODE_ENV === 'test') ?
  { default: { appenders: [ 'console' ], level: 'warn' } } :
  { default: { appenders: [ 'console' ], level: 'info' } };

log4js.configure({
  appenders: {
    console: {
      type: 'console',
      layout: {
        type: 'pattern',
        pattern: '%x{time} [%p] %m',
        tokens: {
          time: () => { return (new Date()).toISOString(); }
        }
      }
    }
  },
  categories: category
});

module.exports = log4js.getLogger();
