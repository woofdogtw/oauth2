/**
 * This module is used for logging API requests.
 *
 * @module routes/Logger
 */
'use strict';

const { error, errid } = require('../../lib/error');

/**
 * Log infomation (typically used for print RESTful API usage).
 *
 * @typedef {Object} LogInfo
 * @property {number} time Timestamp of starting the API.
 * @property {string} source Source IP.
 * @property {string} method API method.
 * @property {string} uri API URI.
 * @property {number} status Status code.
 * @property {number} elapse Elapsed execution time in millisecond with
 *           **S.sss** format (ex: **12.948** means 12 milliseconds).
 * @property {string} [err] The error message.
 */

/**
 * To register the logger to the Express instance.
 *
 * @param {Object} app The Express instance.
 * @param {function} cb The callback function to write log data.
 *   @param {module:routes/Logger~LogInfo} cb.log The log information.
 */
module.exports = (app, cb) => {
  // Pre-handle errors.
  app.use((err, req, res, next) => {
    // Handle 400 error.
    if (err && (err.type === 'entity.parse.failed')) {
      res.statusCode = 400;
      res._err = err.message;
      log(req, res, cb);
      return void next(error(errid.EPARAM, err.message));
    } else if (err && (err.status === 400)) {
      res.statusCode = 400;
      res._err = err.message;
      log(req, res, cb);
      return void next(error(errid.EPARAM, err.message));
    }
    next(err ? error(errid.EUNKNOWN, err.message) : null);
  });

  const startRecordFunc = (req, res, next) => {
    req._startAt = process.hrtime();
    req._startTime = new Date();
    req._ip = req.ip;

    function logHandler() {
      res.removeListener('finish', logHandler);
      res.removeListener('close', logHandler);

      log(req, res, cb);
    }

    // Register HTTP connection event handler.
    res.on('finish', logHandler);
    res.on('close', logHandler);

    next(null);
  };

  // Setup connection listener and start time for logging.
  app.all(/^\/oauth2(\/[\s\S]*)*$/i, startRecordFunc);
  app.all(/^\/api\/session(\/[\s\S]*)*$/i, startRecordFunc);
  app.all(/^\/api\/user(\/[\s\S]*)*$/i, startRecordFunc);
  app.all(/^\/api\/client(\/[\s\S]*)*$/i, startRecordFunc);
};

/**
 * To write log to the callback function.
 *
 * @private
 * @memberof module:routes/Logger
 * @param {Object} req
 * @param {Object} res
 * @param {function} cb The callback function from the
 *        [module function]{@link module:routes/Logger}.
 */
function log(req, res, cb) {
  if (!cb) {
    return;
  } else if (!req._startAt || !req._startTime) {
    return void cb({
      time:    Date.now(),
      source:  req._ip,
      method:  req.method,
      uri:     req.url,
      status:  res.statusCode,
      elapsed: 0,
      err:     res._err
    });
  }

  // Generate ~.xxx format milliseconds elapsed time.
  let diff = process.hrtime(req._startAt);
  diff = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3);

  cb({
    time:    req._startTime.getTime(),
    source:  req._ip,
    method:  req.method,
    uri:     req.url,
    status:  res.statusCode,
    elapsed: diff,
    err:     res._err
  });
}
