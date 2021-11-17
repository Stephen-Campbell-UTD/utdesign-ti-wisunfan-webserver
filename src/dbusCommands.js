const dbus = require('dbus-next')
const bus = dbus.systemBus()
const DBUS_BUS_NAME = 'com.nestlabs.WPANTunnelDriver'
const DBUS_INTERFACE = 'com.nestlabs.WPANTunnelDriver'
const DBUS_OBJECT_PATH = '/com/nestlabs/WPANTunnelDriver/wfan0'
let propValues = require('./propValues.js')
const {
  parseConnectedDevices,
  parseDodagRoute,
  parseMacFilterList,
  getNumConnected
} = require('./parsing.js')

async function sendDBusMessage(command, property, newValue) {
  let methodCall = new dbus.Message({
    destination: DBUS_BUS_NAME,
    path: DBUS_OBJECT_PATH,
    interface: DBUS_INTERFACE,
    member: command,
    signature: 'ss',
    body: [property, newValue],
  })
  return (await bus.call(methodCall)).body
}

async function updateProps() {
  for (property in propValues) {
    await updateProp(property)
    if (Buffer.isBuffer(v = propValues[property])) {
      propValues[property] = bufferToHex(v)
    }
  }
}

async function updateProp(property) {
  propValue = (await sendDBusMessage('GetProp', property, ''))[1]
  switch(property) {
    case 'macfilterlist':
      propValue = parseMacFilterList(propValue)
      break
    case 'dodagroute':
      propValue = parseDodagRoute(propValue)
      break
    case 'connecteddevices':
      propValue = parseConnectedDevices(propValue)
      break
    case 'numconnected':
      propValue = getNumConnected()
      break
  }
  propValues[property] = propValue
}

async function setProp(property, newValue) {
  if ((typeof property != 'undefined') && (newValue != '')) {
    console.log(await sendDBusMessage('SetProp', property, newValue))
    await updateProp(property)
  }
}

function getProps() {
  return propValues
}

function getProp(property) {
  return propValues[property]
}

function bufferToHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
}

module.exports = {
  sendDBusMessage,
  updateProp,
  updateProps,
  setProp,
  getProp,
  getProps
}
