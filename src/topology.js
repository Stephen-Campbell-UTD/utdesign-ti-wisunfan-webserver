let dbus = require('dbus-next');
const os = require('os');
const DBUS_BUS_NAME = 'com.nestlabs.WPANTunnelDriver';
const DBUS_INTERFACE = 'com.nestlabs.WPANTunnelDriver';
const DBUS_META_OBJECT_PATH = '/com/nestlabs/WPANTunnelDriver';
const DBUS_OBJECT_PATH = DBUS_META_OBJECT_PATH + '/' + process.env.NWP_IFACE;

async function sendDBusMessage(command, property, newValue) {
  const bus = dbus.systemBus();
  let methodCall = new dbus.Message({
    destination: DBUS_BUS_NAME,
    path: DBUS_OBJECT_PATH,
    interface: DBUS_INTERFACE,
    member: command,
    signature: 'ss',
    body: [property, newValue],
  });
  return (await bus.call(methodCall)).body;
}

async function setProp(property, newValue) {
  //console.log("DBUS SET",property, newValue)
  if (typeof property != 'undefined' && newValue != '') {
    await sendDBusMessage('SetProp', property, newValue);
  }
}
async function getProp(property) {
  newValue = (await sendDBusMessage('GetProp', property, ''))[1];
  //console.log("DBUS GET",property, typeof newValue,newValue)
  return newValue;
}

function formatIPString(ip) {
  let ipBlocks = ip.split(':');
  //add zeros form  double colon
  //-1 if no double zero
  const doubleZeroIndex = ipBlocks.findIndex(val => val.length === 0);

  if (doubleZeroIndex !== -1) {
    const zeroBlock = '0000';
    const numBlocksToAdd = 8 - ipBlocks.length + 1; // + 1 bc empty string still in ip blocks
    const zeroBlocksToAdd = [];
    for (let i = 0; i < numBlocksToAdd; i++) {
      zeroBlocksToAdd.push(zeroBlock);
    }

    ipBlocks.splice(doubleZeroIndex, 1, ...zeroBlocksToAdd);
  }

  //add leading zeroes
  ipBlocks = ipBlocks.map(ipBlock => {
    return ipBlock.padStart(4, '0');
  });
  const newIPString = ipBlocks.join(':');
  return newIPString;
}

function ipFormatDodagToProper(ipDodagFormat) {
  //TODO
}

function parseConnectedDevices(text) {
  let lineArray = text.split('\n');
  const ipAddrList = lineArray
    .map(line => line.trim())
    .filter(
      line =>
        line.length > 0 &&
        line.includes(':') &&
        // !line.includes("List of connected devices currently in routing table:")) &&
        !line.includes(' ')
    );
  return ipAddrList;

  //   for (let i = 0, l = eachLine.length; i < l; i++) {
  //     if (
  //       !eachLine[i].includes(' ') &&
  //       !!eachLine[i] &&
  //       eachLine[i][0] != ':'
  //     ) {
  //       // add this ip address to the list
  //       ipAddrList.push(eachLine[i]);
  //     }
  //   }
  //   return ipAddrList;
}

function parseDodagRoute(text) {
  var listList = text.split('\n');

  const results = listList
    .map(line => line.trim())
    .filter(
      line =>
        line.length > 0 &&
        line.includes(':') &&
        // !line.includes("List of connected devices currently in routing table:")) &&
        !line.includes(' ')
    );
  // let result =  listList.filter(
  //     (ipv6_candidate) => !ipv6_candidate.includes('Path') && !ipv6_candidate.includes('0000:0000:0000:0000:0000:0000:0000:0000')
  // );
  console.log(text, results);
  return results;
}

async function getAllRoutes() {
  const connectedDevices = await getProp('connecteddevices');
  const ipAddrList = parseConnectedDevices(connectedDevices);

  //Create a union with previous connected devices call (temp fix until wfantund is fixed)
  const connectedDevicesSecondCall = await getProp('connecteddevices');
  parseConnectedDevices(connectedDevicesSecondCall).forEach(secondCallIP => {
    if (!ipAddrList.includes(secondCallIP)) {
      ipAddrList.push(secondCallIP);
    }
  });

  //ip address list could be empty if only the br is in the network
  const brIP = os.networkInterfaces()[process.env.NWP_IFACE][0]['address'];
  const routes = [[brIP]];
  for (const ipAddr of ipAddrList) {
    await setProp('dodagroutedest', ipAddr);
    const rawDodagRoute = await getProp('dodagroute');
    const route = parseDodagRoute(rawDodagRoute);
    routes.push(route);
  }
  return routes;
}

function routesToFlattenedGraph(routes) {
  let nodes = [];
  //populate nodes
  console.log(routes);
  for (const route of routes) {
    for (const ipAddress of route) {
      if (!nodes.some(node => node.id === ipAddress)) {
        nodes.push({data: {id: ipAddress}});
      }
    }
  }
  //populate edges
  let edges = [];
  for (const route of routes) {
    let numPairs = route.length - 1;
    for (let i = 0; i < numPairs; i++) {
      const edge = {};
      edge.source = route[i];
      edge.target = route[i + 1];
      edge.id = `${edge.source}->${edge.target}`;
      if (!edges.some(otherEdge => otherEdge.id === edge.id)) {
        edges.push({data: edge});
      }
    }
  }
  return {nodes, edges};
}

function formatRouteIPs(routes) {
  return routes.map(route => route.map(ip => formatIPString(ip)));
}

async function getLatestTopology() {
  const routes = await getAllRoutes();
  const formattedRoutes = formatRouteIPs(routes);
  const flattenedTopology = routesToFlattenedGraph(formattedRoutes);
  return flattenedTopology;
}

module.exports = {getLatestTopology};
