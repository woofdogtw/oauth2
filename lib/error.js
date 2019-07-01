'use strict';

/**
 * @typedef SysError
 * @type Object
 * @property {number} status The HTTP status code.
 * @property {Object} obj The error object.
 * @property {string} obj.code The error code.
 * @property {string} obj.message The error message.
 */

/**
 * Error ID.
 *
 * @enum {SysError}
 */
const ERROR_ID = {
  EUNKNOWN: {
    status: 503,
    obj: {
      code: 'EUNKNOWN',
      message: 'Unknown error'
    }
  },
  EDB: {
    status: 503,
    obj: {
      code: 'EDB',
      message: 'Database error'
    }
  },
  EPARAM: {
    status: 400,
    obj: {
      code: 'EPARAM',
      message: 'Parameter error'
    }
  },
  EAUTH: {
    status: 401,
    obj: {
      code: 'EAUTH',
      message: 'Authentication error'
    }
  },
  EPERM: {
    status: 403,
    obj: {
      code: 'EPERM',
      message: 'Access denied'
    }
  },
  ESESSION_LOGIN: {
    status: 400,
    obj: {
      code: 'ESESSION_LOGIN',
      message: 'Invalid account or password'
    }
  },
  EUSER_EXISTS: {
    status: 400,
    obj: {
      code: 'EUSER_EXISTS',
      message: 'The account has been registered'
    }
  },
  EUSER_NOT_FOUND: {
    status: 404,
    obj: {
      code: 'EUSER_NOT_FOUND',
      message: 'The specified user is not found'
    }
  },
  ECLIENT_NOT_FOUND: {
    status: 404,
    obj: {
      code: 'ECLIENT_NOT_FOUND',
      message: 'The specified client is not found'
    }
  }
};

/**
 * @see ERROR_ID
 */
module.exports.errid = ERROR_ID;

/**
 * Generate a new **SysError** object with specific message.
 *
 * @param {SysError} err The error object.
 * @param {string} [message] The specified error message.
 * @returns {SysError} The new generated error object.
 */
module.exports.error = (err, message) => {
  if (!err) {
    err = ERROR_ID.EUNKNOWN;
  }
  return {
    status: err.status,
    obj: {
      code: err.obj.code,
      message: message || err.obj.message
    }
  };
};
