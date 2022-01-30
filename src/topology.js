const {getPropDBUS, setProp, setPropDBUS} = require('./dbusCommands.js');
const {topologyLogger} = require('./logger.js');
const {parseConnectedDevices, parseDodagRoute, canonicalIPtoExpandedIP} = require('./parsing.js');
const propValues = require('./propValues.js');

/**
 *
 * @returns {undefined | string} ip address
 */
function getNetworkIPInfo() {
  return propValues['IPv6:AllAddresses'].find(entry => entry.ip.substring(0, 4) !== 'fe80');
}
/**
 * Topology Singleton
 * Manages related properties
 *  - connectedDevices
 *  - numConnected
 *  - dodagroute
 *  - dodagroutedest
 */
const _topology = {
  graph: {nodes: [], edges: []},
  numConnected: 0,
  connectedDevices: [],
  routes: [],
};

const topology = new Proxy(_topology, {
  set: (obj, prop, value) => {
    topologyLogger.info(`Topology State: ${prop} = ${JSON.stringify(value)}`);
    obj[prop] = value;
    return true;
  },
});

function routesToGraph(routes) {
  let nodes = [];
  //populate nodes
  for (const route of routes) {
    for (const ipAddress of route) {
      if (!nodes.some(node => node.data.id === ipAddress)) {
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

/**
 * Calls the necessary DBUS methods for updating topology fields
 */
async function updateTopology() {
  const borderRouterIPInfo = getNetworkIPInfo();
  if (borderRouterIPInfo === undefined) {
    topologyLogger.info('Attempted to update topology with no Border Router IP address!');
    return;
  }

  try {
    let numConnected = 0;
    let connectedDevicesSet = new Set();
    let fetchedAllDevices = false;
    while (!fetchedAllDevices) {
      // the DBUS connecteddevices property is a paginated version of the network's connected devices
      // Ideally, the numconnected DBUS property would be a good way to check
      // the number of pages. (at the time of writing numconnected gives no useful output)
      // The hacky way that is being done here is to keep going until we see an address we have seen before
      const [numInBatch, connectedDevicesBatch] = parseConnectedDevices(
        await getPropDBUS('connecteddevices')
      );

      for (const connectedDevice of connectedDevicesBatch) {
        if (connectedDevicesSet.has(connectedDevice)) {
          fetchedAllDevices = true;
        } else {
          numConnected += 1;
          connectedDevicesSet.add(connectedDevice);
        }
      }
    }

    let connectedDevices = Array.from(connectedDevicesSet);
    connectedDevices.push(borderRouterIPInfo.ip);
    const routes = [];
    for (const ipAddr of connectedDevices) {
      await setPropDBUS('dodagroutedest', canonicalIPtoExpandedIP(ipAddr));
      const route = parseDodagRoute(await getPropDBUS('dodagroute'));
      routes.push(route);
    }
    //numConnected does not include the br itself whereas connectedDevices does
    if (numConnected !== connectedDevices.length - 1) {
      topologyLogger.error(
        `NumConnected Prop: ${numConnected}. ConnectedDevices Length ${connectedDevices.length}`
      );
    }
    topology.numConnected = numConnected;
    topology.connectedDevices = connectedDevices;
    topology.routes = routes;
    topology.graph = routesToGraph(routes);
  } catch (e) {
    topologyLogger.info(`Failed to update. ${e}`);
  }
}

// async function getAllRoutes() {
//   const connectedDevices = getProp('connecteddevices');
//   const ipAddrList = parseConnectedDevices(connectedDevices);

//   //Create a union with previous connected devices call (temp fix until wfantund is fixed)
//   const connectedDevicesSecondCall = getProp('connecteddevices');
//   parseConnectedDevices(connectedDevicesSecondCall).forEach(secondCallIP => {
//     if (!ipAddrList.includes(secondCallIP)) {
//       ipAddrList.push(secondCallIP);
//     }
//   });

//   //ip address list could be empty if only the br is in the network
//   const brIP = os.networkInterfaces()[process.env.NWP_IFACE][0]['address'];
//   const routes = [[brIP]];
//   for (const ipAddr of ipAddrList) {
//     await setProp('dodagroutedest', ipAddr);
//     const rawDodagRoute = getProp('dodagroute');
//     const route = parseDodagRoute(rawDodagRoute);
//     routes.push(route);
//   }
//   return routes;
// }

// function formatRouteIPs(routes) {
//   return routes.map(route => route.map(ip => formatIPString(ip)));
// }

// async function getLatestTopology() {
//   const routes = await getAllRoutes();
//   const formattedRoutes = formatRouteIPs(routes);
//   const flattenedTopology = routesToFlattenedGraph(formattedRoutes);
//   return flattenedTopology;
// }

module.exports = {topology, updateTopology};
