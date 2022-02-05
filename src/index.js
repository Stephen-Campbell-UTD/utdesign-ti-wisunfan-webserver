const express = require('express');
const {httpLogger} = require('./logger.js');
const {initializeRoutes} = require('./routes.js');
const {BorderRouterManager} = require('./BorderRouterManager.js');
const {PingExecutor} = require('./PingExecutor.js');
const http = require('http');
const SocketIOServer = require('socket.io').Server;
const {PORT} = require('./AppConstants.js');
const {initializeSocketIOEvents} = require('./ClientState');

function main() {
  const app = express();
  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: 'http://localhost:3000',
    },
  });
  const brManager = new BorderRouterManager();
  const pingExecutor = new PingExecutor();
  initializeRoutes(app, pingExecutor, brManager);

  initializeSocketIOEvents(io);
  httpServer.listen(PORT, () => {
    httpLogger.info(`Listening on http://localhost:${PORT}`);
  });
  process.on('exit', async code => {
    await brManager.exit();
  });
}

main();
