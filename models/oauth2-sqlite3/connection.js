/**
 * This module is used for connecting to SQLite, implemented with
 * [SQLite](http://www.sqlite.org/).
 *
 * @module model/sqlite3/Connection
 */
'use strict';

// Node.js modules.
const events = require('events');
const path   = require('path');

// 3rd party modules.
const sqlite3 = require('sqlite3');

// Server modules.
const config = require('../../configs/oauth2');
const logger = require('../../lib/logger');

// Constants.
const LOG_MODNAME = '[oauth2-conn-sqlite3]';
let PATH = config.oauth2.db.sqlite3.path;
if (!PATH) {
  if (process.env.NODE_ENV === 'production') {
    PATH = path.join(process.cwd(), 'oauth2.db');
  } else if (process.env.NODE_ENV === 'test') {
    PATH = path.join(process.cwd(), 'oauth2_test.db');
  } else {
    PATH = path.join(process.cwd(), 'oauth2_dev.db');
  }
} else if (!path.isAbsolute(PATH)) {
  PATH = path.join(process.cwd(), PATH);
}

/**
 * The database is disconnected.
 *
 * @event module:model/sqlite3/Connection~Connection#close
 */

/**
 * The database is connected.
 *
 * @event module:model/sqlite3/Connection~Connection#connect
 */

/**
 * The SQLite3 database connection. This class can help you to manage the
 * SQLite connection. It will retry connecting automatically.
 */
class Connection extends events.EventEmitter {
  /**
   * @param {string} path The SQLite file path.
   */
  constructor(path) {
    super();

    this._path = path;
    this._connection = null;  // The connected object.
  }

  /**
   * Get the `sqlite3.Database` object.
   *
   * @returns {?sqlite3.Database} `null` means the connection is closed.
   */
  get connection() {
    return this._connection;
  }

  /**
   * Try to connect the database. It will retry every seconds until it is
   * connected.
   */
  connect() {
    let conn = new sqlite3.Database(this._path, (err) => {
      if (err) {
        logger.error(`${LOG_MODNAME} ${err.message}`);
        return void setTimeout(this.connect, 1000);
      }
      this._connection = conn;
      this.emit('connect');
    });
  }

  /**
   * Close the database connection.
   *
   * @param {function} callback
   *   @param {?Error} callback.err
   */
  close(callback) {
    if (this._connection) {
      this._connection.close((err) => {
        this.emit('close');
        this._connection = null;
        callback(err);
      });
    }
  }
}

let conn = new Connection(PATH);
conn.connect();

module.exports = conn;
