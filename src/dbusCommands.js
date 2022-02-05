const dbus = require('dbus-next');
const bus = dbus.systemBus();
const DBUS_BUS_NAME = 'com.nestlabs.WPANTunnelDriver';
const DBUS_INTERFACE = 'com.nestlabs.WPANTunnelDriver';
const DBUS_OBJECT_PATH = '/com/nestlabs/WPANTunnelDriver/wfan0';
const {propValues} = require('./propValues.js');
const {WFANTUND_STATUS} = require('./wfantundConstants');
const {parseMacFilterList, parseNCPIPv6} = require('./parsing.js');
const {getKeyByValue} = require('./utils.js');
const {dbusLogger} = require('./logger.js');

async function sendDBusMessage(command, property, newValue) {
  let methodCall = new dbus.Message({
    destination: DBUS_BUS_NAME,
    path: DBUS_OBJECT_PATH,
    interface: DBUS_INTERFACE,
    member: command,
    signature: 'ss',
    body: [property, newValue],
  });
  dbusLogger.debug(`${command} ${property} ${newValue}`);
  try {
    let dbusReply = await bus.call(methodCall);
    if (dbusReply === null) {
      throw Error('DBUS Reply Null');
    }
    if (dbusReply.body[0] !== WFANTUND_STATUS.Ok) {
      //dbusReply.body[0] is a wfantund status e.g. code 7 for timeout or code 0 for ok
      const errorKey = getKeyByValue(WFANTUND_STATUS, dbusReply.body[0]);
      if (errorKey === undefined) {
        //error key isn't found in WFA
        throw Error('Received dbus reply with invalid wfantund status');
      }
      dbusLogger.debug(`wfantund command return status: ${errorKey}`);
      throw Error(`Received not ok status: ${errorKey}`);
    }
    if (dbusReply.type !== 2) {
      dbusLogger.debug(`Not Return messageType: ${dbusReply.type}`);
    }
    return dbusReply.body[1];
  } catch (error) {
    //e.g. the member/interface can't be found
    dbusLogger.debug(`${command} Failed. ${error.message}`);
    throw Error(`DBUS Message Call Failure. ${error.message}`);
  }
}

async function getPropDBUS(property) {
  return await sendDBusMessage('GetProp', property, '');
}
async function setPropDBUS(property, newValue) {
  return await sendDBusMessage('SetProp', property, newValue);
}

async function updateProp(property) {
  let propValue = await getPropDBUS(property);
  switch (property) {
    case 'macfilterlist':
      propValue = parseMacFilterList(propValue);
      break;
    case 'IPv6:AllAddresses':
      propValue = parseNCPIPv6(propValue);
      break;
    case 'NCP:HardwareAddress':
      propValue = Buffer.from(propValue).toString('hex');
      break;
    case 'Network:Panid':
      propValue = propValue.toString(16).toUpperCase();
      break;
  }
  propValues[property] = propValue;
}
async function setProp(property, newValue) {
  if (typeof property !== 'undefined' && newValue !== '') {
    await setPropDBUS(property, newValue);
    await updateProp(property);
  }
}

function getProps() {
  return propValues;
}

function getProp(property) {
  if (!(property in propValues)) {
    throw Error(`Property ${property} not in propValues`);
  } else {
    return propValues[property];
  }
}

module.exports = {
  sendDBusMessage,
  updateProp,
  setPropDBUS,
  getPropDBUS,
  setProp,
  getProp,
  getProps,
};
