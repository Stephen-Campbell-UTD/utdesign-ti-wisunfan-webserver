// Initial property values object for easy updating
const {appStateLogger} = require('./logger.js');

/*
This propValues variable is simply a wrapper for _propValuse that will log every time a
value is set.  For example, propValues["Interface:Up"] = true will have the same effect as
_propValues["Interface:Up"] = true but will also log that the value changed
*/
const _propValues = {
  'NCP:ProtocolVersion': '',
  'NCP:Version': '',
  'NCP:InterfaceType': -1,
  'NCP:HardwareAddress': '',
  'NCP:CCAThreshold': -1,
  'NCP:TXPower': -1,
  'NCP:Region': '',
  'NCP:ModeID': -1,
  unicastchlist: '',
  broadcastchlist: '',
  asyncchlist: '',
  chspacing: '',
  ch0centerfreq: '',
  'Network:Panid': '',
  bcdwellinterval: -1,
  ucdwellinterval: -1,
  bcinterval: -1,
  ucchfunction: -1,
  bcchfunction: -1,
  macfilterlist: [],
  macfiltermode: -1,
  'Interface:Up': false,
  'Stack:Up': false,
  'Network:NodeType': '',
  'Network:Name': '',
  'IPv6:AllAddresses': [],
};

const propValues = new Proxy(_propValues, {
  set: (obj, prop, value) => {
    appStateLogger.info(`NCP ${prop} = ${JSON.stringify(value)}`);
    obj[prop] = value;
    return true;
  },
});

module.exports = propValues;
