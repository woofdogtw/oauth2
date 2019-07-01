'use strict';

const _ = require('lodash');

const { errid, error } = require('../../../lib/error');

/**
 * Test `error(err, message)` with default message.
 */
module.exports.error = function(done) {
  const err = error(errid.EDB);
  if (!_.isEqual(err, errid.EDB)) {
    return void done(Error('Content not equal'));
  }
  done(null);
};

/**
 * Test `error(err, message)` with user specified message.
 */
module.exports.errorMsg = function(done) {
  const msg = 'test message';
  const err = error(errid.EDB, msg);
  if (_.isEqual(err, errid.EDB)) {
    return void done(Error('Content must not be equal'));
  } else if ((err.status !== errid.EDB.status) ||
      (err.obj.code !== errid.EDB.obj.code) ||
      (err.obj.message !== msg)) {
    return void done(Error('Content error'));
  }
  done(null);
};

/**
 * Test `error(err, message)` with wrong error ID.
 */
module.exports.errorWrong = function(done) {
  const err = error(errid.WRONG_ERR_ID);
  if (!_.isEqual(err, errid.EUNKNOWN)) {
    return void done(Error('Content must be EUNKOWN'));
  }
  done(null);
};
