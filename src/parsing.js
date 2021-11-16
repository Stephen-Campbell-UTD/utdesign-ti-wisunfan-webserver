// uses data from propvalues
// used in dbusCommands, index

let propValues = require('./propValues.js')
let numConnectedDevices = 0

function parseConnectedDevices() {
  console.log('parsing connected devices');
  devicesArray = propValues['connecteddevices'].split("\n")
  connectedDevices = ""

  for(let index in devicesArray) {
    if (devicesArray[index] == "List of connected devices currently in routing table:" || devicesArray[index] == "") {
        // Do nothing
    } else if (devicesArray[index].substring(0, 28) == "Number of connected devices:") {
        tempSplit = devicesArray[index].split(": ")
        numConnectedDevices = tempSplit[1]
    } else {
        connectedDevices += devicesArray[index] + "|"
    }
  }

  if(connectedDevices.length >= 1) {
      connectedDevices = connectedDevices.slice(0, -1);
  }

  return connectedDevices
}

function getNumConnectedDevices() {
  return numConnectedDevices
}

module.exports = {
  parseConnectedDevices,
  getNumConnectedDevices
}
