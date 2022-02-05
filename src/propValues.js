// Initial property values object for easy updating
const {appStateLogger} = require('./logger.js');

//In this context, null means that we do not know the value of the property yet
const propDefaultValues = {
  'NCP:State': null,
  'NCP:ProtocolVersion': null,
  'NCP:Version': null,
  'NCP:InterfaceType': null,
  'NCP:HardwareAddress': null,
  'NCP:CCAThreshold': null,
  'NCP:TXPower': null,
  'NCP:Region': null,
  'NCP:ModeID': null,
  unicastchlist: null,
  broadcastchlist: null,
  asyncchlist: null,
  chspacing: null,
  ch0centerfreq: null,
  'Network:Panid': null,
  bcdwellinterval: null,
  ucdwellinterval: null,
  bcinterval: null,
  ucchfunction: null,
  bcchfunction: null,
  macfilterlist: null,
  macfiltermode: null,
  'Interface:Up': null,
  'Stack:Up': null,
  'Network:NodeType': null,
  'Network:Name': null,
  'IPv6:AllAddresses': null,
};

/*
This propValues variable is simply a wrapper for _propValuse that will log every time a
value is set.  For example, propValues["Interface:Up"] = true will have the same effect as
_propValues["Interface:Up"] = true but will also log that the value changed
*/
const _propValues = {...propDefaultValues};

const propValues = new Proxy(_propValues, {
  set: (obj, prop, value) => {
    appStateLogger.info(`NCP ${prop} = ${JSON.stringify(value)}`);
    obj[prop] = value;
    return true;
  },
});

function resetPropValues() {
  for (const prop in propValues) {
    propValues[prop] = null;
  }
}

module.exports = {resetPropValues, propValues};
