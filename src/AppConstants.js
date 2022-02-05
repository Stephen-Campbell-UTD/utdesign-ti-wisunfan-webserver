const OUTPUT_FILE_PATH = './output/PingResults.csv';
const WFANTUND_PATH = '/usr/local/sbin/wfantund';
const BR_FILE_PATH = '/dev/ttyACM0';
const PROPERTY_UPDATE_INTERVAL = 1000; // in ms
const TOPOLOGY_UPDATE_INTERVAL = 10000; // in ms

const PORT = 8000;

module.exports = {
  OUTPUT_FILE_PATH,
  WFANTUND_PATH,
  BR_FILE_PATH,
  PROPERTY_UPDATE_INTERVAL,
  TOPOLOGY_UPDATE_INTERVAL,
  PORT,
};
