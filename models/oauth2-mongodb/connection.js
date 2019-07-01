/**
 * This module is used for connecting to MongoDB, implemented with
 * [MongoDB](https://www.mongodb.com/).
 *
 * @module model/mongodb/Connection
 */
'use strict';

// Node.js modules.
const events = require('events');

// 3rd party modules.
const mongodb = require('mongodb');

// Server modules.
const config = require('../../configs/oauth2');
const logger = require('../../lib/logger');

// Constants.
const LOG_MODNAME = '[oauth2-conn-mongodb]';
const URL = config.oauth2.db.mongodb.url || 'mongodb://localhost';
let DB = config.oauth2.db.mongodb.db;
if (!DB) {
  if (process.env.NODE_ENV === 'production') {
    DB = 'oauth2';
  } else if (process.env.NODE_ENV === 'test') {
    DB = 'oauth2_test';
  } else {
    DB = 'oauth2_dev';
  }
}
const DB_OPTS = {
  useNewUrlParser: true
};

/**
 * The database is disconnected.
 *
 * @event module:model/mongodb/Connection~Connection#close
 */

/**
 * The database is connected.
 *
 * @event module:model/mongodb/Connection~Connection#connect
 */

/**
 * The MongoDB database connection. This class can help you to manage the
 * MongoDB connection. It will retry connecting automatically.
 */
class Connection extends events.EventEmitter {
  constructor(url) {
    super();

    this._url = url;
    this._connection = null;  // The Db object.
    this._client = null;      // The MongoClient object.
  }

  /**
   * Get the `Db` object.
   *
   * @returns {?Db} `null` means the connection is closed.
   */
  get connection() {
    return this._connection;
  }

  /**
   * Try to connect the database. It will retry every seconds until it is
   * connected.
   */
  connect() {
    mongodb.MongoClient.connect(this._url, DB_OPTS, (err, client) => {
      if (err) {
        logger.error(`${LOG_MODNAME} ${err.message}`);
        return void setTimeout(this.connect, 1000);
      }
      let db = client.db(DB);
      db.on('close', (err) => {
        logger.error(`${LOG_MODNAME} close: ${err.message}`);
        this.emit('close');
      });
      db.on('reconnect', () => {
        logger.error(`${LOG_MODNAME} reconnect`);
        this.emit('connect');
      });
      this._connection = db;
      this._client = client;
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
    this.emit('close');
    if (this._connection) {
      this._connection.removeAllListeners();
      this._connection = null;
    }
    if (this._client) {
      this._client.close(true);
      this._client = null;
    }
    process.nextTick(() => { callback(null); });
  }
}

let conn = new Connection(URL);
conn.connect();

module.exports = conn;
