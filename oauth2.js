'use strict';

// Node.js modules.
const fs    = require('fs');
const http  = require('http');
const https = require('https');
const path  = require('path');

// 3rd party modules.
const bodyParser     = require('body-parser');
const cors           = require('cors');
const express        = require('express');
const methodOverride = require('method-override');
const serveStatic    = require('serve-static');

// Server modules.
const config = require('./configs/oauth2');
const logger = require('./lib/logger');

// URI routing modules.
const oauth2Routes = require('./routes/oauth2');
const oauth2Logger = require('./routes/oauth2/logger');

// Create an Express server instance.
let app = express();

// Express environment variables.
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.disable('x-powered-by');

// Express middlewares.
app.use(cors({ origin: '*' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(serveStatic(path.join(__dirname, 'public')));

// Express URI routes.
oauth2Logger(app, routesLogger);
oauth2Routes(app);
app.all('*', (req, res) => { res.status(404).end(); });

// Start HTTP server.
let httpServer = http.createServer(app);
httpServer.listen(config.service.httpPort, () => {
  logger.info(`OAuth2 listening on port ${config.service.httpPort}`);
});

// Start HTTPS server.
let opts = {
  key: fs.readFileSync(config.service.key ||
    path.join(__dirname, 'credentials', 'key.pem')),
  cert: fs.readFileSync(config.service.cert ||
    path.join(__dirname, 'credentials', 'cert.pem')),
};
if (config.service.cacert) {
  opts.ca = fs.readFileSync(config.service.cacert);
} else if (fs.existsSync(path.join(__dirname, 'credentials', 'cacert.pem'))) {
  opts.ca = fs.readFileSync(path.join(__dirname, 'credentials', 'cacert.pem'));
}
let httpsServer = https.createServer(opts, app);
httpsServer.listen(config.service.httpsPort, () => {
  logger.info(`OAuth2 listening on secure port ${config.service.httpsPort}`);
});

/**
 * To print RESTful API usage log in the console output.
 *
 * @param {module:routes/Logger~LogInfo} log The log information.
 */
function routesLogger(log) {
  const logStr = `[${log.source}] ${log.status} ${log.method} ${log.uri} ` +
    `(${log.elapsed} ms)` + (log.err ? ` - ${log.err}` : '');

  if ((log.status >= 500) && (log.status <= 599)) {
    logger.warn(logStr);
  } else {
    logger.info(logStr);
  }
}

// Export for unit test.
module.exports = {
  app,
  http: httpServer,
  https: httpsServer
};
