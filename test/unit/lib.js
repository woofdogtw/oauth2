'use strict';

const error = require('./lib/error');

describe('unit.lib', function() {
  describe('error', function() {
    it('EDB with default string', error.error);
    it('EDB with user specified string', error.errorMsg);
    it('Wrong error ID must convert to EUNKNOWN', error.errorWrong);
  });
});
