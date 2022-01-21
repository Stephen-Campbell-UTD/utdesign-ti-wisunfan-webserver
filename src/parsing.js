// uses data from propvalues
// used in dbusCommands, index
let propValues = require('./propValues.js');
let numConnected = 0;

function parseConnectedDevices(text) {
  let listArray = text.split('\n');
  // Parse IPs into connectedDevices array
  const connectedDevices = listArray
    .map(line => line.trim())
    .filter(line => line.length > 0 && line.includes(':') && !line.includes(' '));
  // Parse the digits from Number of connected devices
  numConnected = listArray
    .map(line => line.trim())
    .filter(line => line.includes('Number of connected devices'))
    .toString()
    .replace(/\D/g, '');
  return connectedDevices;
}

function parseDodagRoute(text) {
  let listArray = text.split('\n');
  // Parse IPs into dodagRoute array
  return listArray
    .map(line => line.trim())
    .filter(line => line.length > 0 && line.includes(':') && !line.includes(' '));
}

function parseMacFilterList(text) {
  let listArray = text.split('\n');
  return listArray.map(line => line.trim()).filter(line => line.length > 0);
}

function getNumConnected() {
  return numConnected;
}

module.exports = {
  parseConnectedDevices,
  parseDodagRoute,
  parseMacFilterList,
  getNumConnected,
};
