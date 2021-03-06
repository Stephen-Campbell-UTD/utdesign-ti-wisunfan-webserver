const {getPropDBUS, setPropDBUS} = require('./dbusCommands.js');
const {topologyLogger} = require('./logger.js');
const {parseConnectedDevices, parseDodagRoute, canonicalIPtoExpandedIP} = require('./parsing.js');
const {getNetworkIPInfo} = require('./ClientState.js');

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
async function getLatestTopology(ClientState) {
  const borderRouterIPInfo = getNetworkIPInfo(ClientState);
  if (borderRouterIPInfo === undefined) {
    topologyLogger.debug('Attempted to get latest topology with no Border Router IP address!');
    return;
  }

  try {
    let numConnected = 0;
    let connectedDevicesSet = new Set();
    let fetchedAllDevices = false;
    const MAX_ITERATIONS = 100;
    let iterations = 0;
    while (!fetchedAllDevices && iterations < MAX_ITERATIONS) {
      // the DBUS connecteddevices property is a paginated version of the network's connected devices
      // Ideally, the numconnected DBUS property would be a good way to check
      // the number of pages. (at the time of writing numconnected gives no useful output)
      // The hacky way that is being done here is to keep going until we see an address we have seen before
      const [numInBatch, connectedDevicesBatch] = parseConnectedDevices(
        await getPropDBUS('connecteddevices')
      );
      if (connectedDevicesBatch.length === 0) {
        fetchedAllDevices = true;
      }

      for (const connectedDevice of connectedDevicesBatch) {
        if (connectedDevicesSet.has(connectedDevice)) {
          fetchedAllDevices = true;
        } else {
          numConnected += 1;
          connectedDevicesSet.add(connectedDevice);
        }
      }
      iterations++;
    }

    let connectedDevices = Array.from(connectedDevicesSet).sort();
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
    const graph = routesToGraph(routes);
    return {numConnected, connectedDevices, routes, graph};
  } catch (e) {
    topologyLogger.debug(`Failed to update. ${e}`);
  }
}

module.exports = {getLatestTopology};
