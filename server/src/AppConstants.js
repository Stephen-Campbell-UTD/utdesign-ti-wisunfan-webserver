const {program} = require('commander');
const {execFile} = require('child_process');
const {appStateLogger} = require('./logger');
const fs = require('fs');

const CONSTANTS = {
  OUTPUT_DIR_PATH: '/tmp/utdesign-wisunfan-webserver/output',
  PING_RESULTS_FILE_NAME: 'PingResults.csv',
  WFANTUND_PATH: '/usr/local/sbin/wfantund',
  BR_FILE_PATH: '/dev/ttyACM0',
  PROPERTY_UPDATE_INTERVAL: 1000, // in ms
  TOPOLOGY_UPDATE_INTERVAL: 10000, // in ms
  PORT: 80,
  HOST: 'localhost',
};

function setAppConstants() {
  program.option(
    '-s, --serial-port <file-path>',
    'File path to watch for border router',
    CONSTANTS.BR_FILE_PATH
  );
  program.option('-p, --port <port>', 'Port to open http server on', CONSTANTS.PORT);
  program.option('-h, --host <hostname>', 'Host to open http server on', CONSTANTS.HOST);
  program.option(
    '-w, --wfantund-path <file-path>',
    'Port to open http server on',
    CONSTANTS.WFANTUND_PATH
  );
  program.option(
    '-t, --topology-interval <interval>',
    'Interval to update topology data structure in ms',
    CONSTANTS.TOPOLOGY_UPDATE_INTERVAL
  );
  program.option(
    '-u, --property-interval <interval>',
    'Interval to update ncp properties data structure in ms',
    CONSTANTS.PROPERTY_UPDATE_INTERVAL
  );
  program.parse(process.argv);
  const options = program.opts();
  CONSTANTS.BR_FILE_PATH = options.serialPort;
  CONSTANTS.PORT = options.port;
  CONSTANTS.WFANTUND_PATH = options.wfantundPath;
  CONSTANTS.TOPOLOGY_UPDATE_INTERVAL = options.topologyInterval;
  CONSTANTS.PROPERTY_UPDATE_INTERVAL = options.propertyInterval;
  CONSTANTS.HOST = options.host;
}

function assertDependencies() {
  const child = execFile(CONSTANTS.WFANTUND_PATH, ['--version'], (error, stdout, stderr) => {
    if (error) {
      appStateLogger.error('Could not execute wfantund with path given');
      process.exit(1);
    }
  });
}

function setupTmpDirs() {
  if (!fs.existsSync(CONSTANTS.OUTPUT_DIR_PATH)) {
    fs.mkdirSync(CONSTANTS.OUTPUT_DIR_PATH, {recursive: true});
  }
}

module.exports = {
  CONSTANTS,
  setAppConstants,
  assertDependencies,
  setupTmpDirs,
};
