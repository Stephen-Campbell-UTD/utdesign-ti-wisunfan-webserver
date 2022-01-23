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
  'NCP:InterfaceType': '',
  'NCP:HardwareAddress': '',
  'NCP:CCAThreshold': '',
  'NCP:TXPower': '',
  'NCP:Region': '',
  'NCP:ModeID': '',
  unicastchlist: '',
  broadcastchlist: '',
  asyncchlist: '',
  chspacing: '',
  ch0centerfreq: '',
  'Network:Panid': '',
  bcdwellinterval: '',
  ucdwellinterval: '',
  bcinterval: '',
  ucchfunction: '',
  bcchfunction: '',
  macfilterlist: '',
  macfiltermode: '',
  'Interface:Up': '',
  'Stack:Up': '',
  'Network:NodeType': '',
  'Network:Name': '',
  dodagroutedest: '',
  dodagroute: '',
  connecteddevices: '',
  numconnected: '',
  'IPv6:AllAddresses': '',
};

const propValues = new Proxy(_propValues, {
  set: (obj, prop, value) => {
    appStateLogger.info(`NCP ${prop} = ${value}`);
    obj[prop] = value;
    return true;
  },
});
module.exports = propValues;
