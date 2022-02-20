const express = require('express');
const {httpLogger} = require('./logger.js');
const {initializeRoutes} = require('./routes.js');
const {BorderRouterManager} = require('./BorderRouterManager.js');
const {PingExecutor} = require('./PingExecutor.js');
const http = require('http');
const SocketIOServer = require('socket.io').Server;
const {CONSTANTS, setAppConstants, assertDependencies, setupTmpDirs} = require('./AppConstants.js');
const {initializeSocketIOEvents} = require('./ClientState');

function main() {
  setAppConstants();
  assertDependencies();
  setupTmpDirs();
  const app = express();
  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer);
  initializeSocketIOEvents(io);
  const brManager = new BorderRouterManager();
  const pingExecutor = new PingExecutor();
  initializeRoutes(app, pingExecutor, brManager);

  httpServer.listen(CONSTANTS.PORT, CONSTANTS.HOST, () => {
    httpLogger.info(`Listening on http://${CONSTANTS.HOST}:${CONSTANTS.PORT}`);
  });
  process.on('exit', async code => {
    await brManager.exit();
  });
}

main();
