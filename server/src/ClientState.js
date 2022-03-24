const {parseMacFilterList, parseNCPIPv6, parseChList} = require('./parsing.js');
const {getPropDBUS, setPropDBUS} = require('./dbusCommands.js');
const {appStateLogger} = require('./logger.js');
const {observe, generate} = require('fast-json-patch');

const defaultNCPProperties = () => {
  return {
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
    'IPv6:AllAddresses': [],
  };
};

const defaultTopology = () => {
  return {
    //cytoscape style graph
    graph: {nodes: [], edges: []},
    numConnected: 0,
    //list of connected ips (including border router)
    connectedDevices: [],
    //array of routes from root to leaf
    routes: [],
  };
};

//this non-circular js object is synced, via socket.io, to the client
const ClientState = {
  //Number of elaboration of mesh connections
  topology: defaultTopology(),
  pingbursts: [],
  //is /dev/ttyACM0 available for connection
  connected: false,
  //properties that are retreived from wfantund
  ncpProperties: defaultNCPProperties(),
};

function initializeSocketIOEvents(io) {
  // const ClientStateProxy = new JSONPatcherProxy(_ClientState);
  const clientStateObserver = observe(ClientState);

  setInterval(() => {
    const patches = generate(clientStateObserver);
    if (patches.length > 0) {
      appStateLogger.debug(`Sending State Patch to Clients. ${JSON.stringify(patches, null, 2)}`);
      io.emit('stateChange', patches);
    }
  }, 50);

  // ClientState = ClientStateProxy.observe(false, patch => {
  //   appStateLogger.info(`Sending State Patch to Clients. ${JSON.stringify(patch, null, 2)}`);
  //   io.emit('stateChange', [patch]);
  // });

  io.on('connection', socket => {
    socket.emit('initialState', ClientState);
    appStateLogger.info('SocketIO Client Connection Established. Sending State');
    appStateLogger.debug(JSON.stringify(ClientState, null, 2));
  });
}

async function getLatestProp(property) {
  let propValue = await getPropDBUS(property);
  switch (property) {
    case 'unicastchlist':
    case 'broadcastchlist':
    case 'asyncchlist':
      propValue = parseChList(propValue);
      break;
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
      propValue = `0x${propValue.toString(16).toUpperCase().padStart(4, '0')}`;
      break;
  }
  return propValue;
}

/**
 *
 * @returns {undefined | string} ip address
 */
function getNetworkIPInfo(ClientState) {
  return ClientState.ncpProperties['IPv6:AllAddresses'].find(
    entry => entry.ip.substring(0, 4) !== 'fe80'
  );
}

function resetNCPPropertyValues() {
  Object.assign(ClientState.ncpProperties, defaultNCPProperties());
}

function resetTopology() {
  Object.assign(ClientState.topology, defaultTopology());
}

async function setProp(property, newValue) {
  if (typeof property !== 'undefined' && newValue !== '') {
    await setPropDBUS(property, newValue);
    const latestValue = await getLatestProp(property);
    return latestValue === newValue;
  }
  return false;
}

module.exports = {
  ClientState,
  resetNCPPropertyValues,
  resetTopology,
  setProp,
  getLatestProp,
  getNetworkIPInfo,
  initializeSocketIOEvents,
};
