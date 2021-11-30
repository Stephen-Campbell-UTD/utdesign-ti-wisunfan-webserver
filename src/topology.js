let dbus = require('dbus-next');
const os = require('os');
const DBUS_BUS_NAME = 'com.nestlabs.WPANTunnelDriver';
const DBUS_INTERFACE = 'com.nestlabs.WPANTunnelDriver';
const DBUS_META_OBJECT_PATH = '/com/nestlabs/WPANTunnelDriver';
const DBUS_OBJECT_PATH =
  DBUS_META_OBJECT_PATH + '/' + process.env.NWP_IFACE;

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

async function set_prop(property, newValue) {
  //console.log("DBUS SET",property, newValue)
  if (typeof property != 'undefined' && newValue != '') {
    await sendDBusMessage('SetProp', property, newValue);
  }
}
async function get_prop(property) {
  newValue = (await sendDBusMessage('GetProp', property, ''))[1];
  //console.log("DBUS GET",property, typeof newValue,newValue)
  return newValue;
}

function format_ip_string(ip) {
  let ip_blocks = ip.split(':');
  //add zeros form  double colon
  //-1 if no double zero
  const double_zero_index = ip_blocks.findIndex(
    (val) => val.length === 0,
  );

  if (double_zero_index !== -1) {
    const zero_block = '0000';
    const num_blocks_to_add = 8 - ip_blocks.length + 1; // + 1 bc empty string still in ip blocks
    const zero_blocks_to_add = [];
    for (let i = 0; i < num_blocks_to_add; i++) {
      zero_blocks_to_add.push(zero_block);
    }

    ip_blocks.splice(double_zero_index, 1, ...zero_blocks_to_add);
  }

  //add leading zeroes
  ip_blocks = ip_blocks.map((ip_block) => {
    return ip_block.padStart(4, '0');
  });
  const new_ip_string = ip_blocks.join(':');
  return new_ip_string;
}

function ip_format_dodag_to_proper(ip) {
  ip = ip.replace(/(:0000){1,8}/, ':');
  ip = ip.replace(/:0{1,3}/g, ':');
  return ip;
}

function parse_connected_devices(text) {
  let line_array = text.split('\n');
  const ip_addr_list = line_array
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 && line.includes(':') && !line.includes(' '),
    );
  return ip_addr_list;
}

function parse_dodag_route(text) {
  var line_list = text.split('\n');

  const results = line_list
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 && line.includes(':') && !line.includes(' '),
    );
  return results;
}

async function get_all_routes() {
  const connected_devices = await get_prop('connecteddevices');
  const ip_addr_list = parse_connected_devices(connected_devices);

  //Create a union with previous connected devices call (temp fix until wfantund is fixed)
  const connected_devices_second_call = await get_prop(
    'connecteddevices',
  );
  parse_connected_devices(connected_devices_second_call).forEach(
    (second_call_ip) => {
      if (!ip_addr_list.includes(second_call_ip)) {
        ip_addr_list.push(second_call_ip);
      }
    },
  );

  //ip address list could be empty if only the br is in the network
  const br_ip =
    os.networkInterfaces()[process.env.NWP_IFACE][0]['address'];
  const routes = [[br_ip]];
  for (const ip_addr of ip_addr_list) {
    await set_prop('dodagroutedest', format_ip_string(ip_addr));
    const raw_dodag_route = await get_prop('dodagroute');
    const route = parse_dodag_route(raw_dodag_route);
    routes.push(route);
  }
  return routes;
}

function routes_to_flattened_graph(routes) {
  let nodes = [];
  //populate nodes
  // console.log(routes);
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

function format_route_ips(routes) {
  return routes.map((route) =>
    route.map((ip) => format_ip_string(ip)),
  );
}

async function get_latest_topology() {
  const routes = await get_all_routes();
  const flattened_topology = routes_to_flattened_graph(routes);
  return flattened_topology;
}

module.exports = { get_latest_topology };
