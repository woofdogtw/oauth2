'use strict';

// Node.js modules.
const cluster = require('cluster');
const os      = require('os');
const path    = require('path');

const logger = require('./lib/logger');

cluster.setupMaster({ exec: path.join(__dirname, 'oauth2.js') });

cluster.on('exit', (worker, code, signal) => {
  logger.error(`[cluster] Worker ${worker.process.pid} exit code ${code}`);
  cluster.fork();
});

const cpus = os.cpus();
for (let i = 0; i < cpus.length; i++) {
  cluster.fork();
}
