let dbus = require('dbus-next');
const DBUS_BUS_NAME = 'com.nestlabs.WPANTunnelDriver';
const DBUS_INTERFACE = 'com.nestlabs.WPANTunnelDriver';
const DBUS_META_OBJECT_PATH = '/com/nestlabs/WPANTunnelDriver';
const DBUS_WPAN0_OBJECT_PATH = DBUS_META_OBJECT_PATH + '/wpan0';

async function wpan_get_prop(property_name) {
  const bus = dbus.systemBus();
  const object_path = DBUS_WPAN0_OBJECT_PATH;
  const method = 'GetProp';
  let methodCall = new dbus.Message({
    destination: DBUS_BUS_NAME,
    path: object_path,
    interface: DBUS_INTERFACE,
    member: method,
    signature: 's',
    body: [property_name],
  });
  let reply = await bus.call(methodCall);
  return reply.body[1];
}
async function wpan_set_prop(property_name, value) {
  const bus = dbus.systemBus();
  const object_path = DBUS_WPAN0_OBJECT_PATH;
  const method = 'SetProp';
  let methodCall = new dbus.Message({
    destination: DBUS_BUS_NAME,
    path: object_path,
    interface: DBUS_INTERFACE,
    member: method,
    signature: 'ss',
    body: [property_name, value],
  });
  let reply = await bus.call(methodCall);
  return reply.body[1];
}

function parse_connected_devices(text) {
  let ip_addr_list = [];
  let eachLine = text.split('\n');
  console.log('[Connected Devices] Lines found: ' + eachLine.length);

  for (var i = 0, l = eachLine.length; i < l; i++) {
    if (
      !eachLine[i].includes(' ') &&
      !!eachLine[i] &&
      eachLine[i][0] != ':'
    ) {
      // add this ip address to the list
      ip_addr_list.push(eachLine[i]);
    }
  }
  return ip_addr_list;
}

function parse_dodag_route(text) {
  var line_list = text.split('\n');
  return filter(
    line_list,
    (ipv6_candidate) => !ipv6_candidate.includes('Path'),
  );
}

async function get_all_routes() {
  const connected_devices = await wpan_get_prop('connecteddevices');
  const ip_addr_list = parse_connected_devices(connected_devices);
  //ip address list could be empty if only the br is in the network
  const routes = [];
  for (const ip_addr of ip_addr_list) {
    await wpan_set_prop('dodagroutedest', ip_addr);
    const raw_dodag_route = await wpan_get_prop('dodagroute');
    const route = parse_dodag_route(raw_dodag_route);
    routes.push(route);
  }
  return routes;
}

function routes_to_flattened_graph(routes) {
  let nodes = [];
  //populate nodes
  for (const route of routes) {
    for (const ip_address of route) {
      if (!nodes.some((node) => node.id === ip_address)) {
        nodes.push({ data: { id: ip_address } });
      }
    }
  }
  //populate edges
  let edges = [];
  for (const route of routes) {
    let num_pairs = route.length - 1;
    for (let i = 0; i < num_pairs; i++) {
      const edge = {};
      edge.source = route[i];
      edge.target = route[i + 1];
      edge.id = `${edge.source}->${edge.target}`;
      if (!edges.some((other_edge) => other_edge.id === edge.id)) {
        edges.push({ data: edge });
      }
    }
  }
  return { nodes, edges };
}

async function get_latest_topology() {
  const routes = await get_all_routes();
  const flattened_topology = routes_to_flattened_graph(routes);
  return flattened_topology;
}

// get_all_routes().then((routes)=>{console.log("Routes",routes)})

module.exports = { get_latest_topology };
