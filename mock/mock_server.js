let express = require('express');
let cors = require('cors');
let fs = require('fs');
const {repeat_n_times, timestamp} = require('../src/utils.js');
const mock_topology = require('./mock_topology.js');
const propValues = require('./mock_prop_values');
const output_file_path = './output/Ping_Results.csv';

const TOPOLOGY_UPDATE_INTERVAL = 5;
const state = {
  connected: false, //gw bringup
  ready: false,
  interval_id_ping: 0,
  interval_id_topology: 0,
  source_ip: 'wfan0 interface not found',
  pingbursts: [],
  topology: {nodes: [], edges: []},
};

function updateProps() {}
function updateProp(property) {}

function setProp(property, newValue) {
  if (typeof property != 'undefined' && newValue != '') {
    propValues[property] = newValue;
  }
}

function getProps() {
  return propValues;
}

function getProp(property) {
  return propValues[property];
}

function initialize_ping() {
  console.log('[PING] Initialized');
  //creation of the csv file
  const csv_headers =
    'ping_burst_id,source_ip,dest_ip,start_time,duration,packet_size,was_success\n';
  fs.writeFile(output_file_path, csv_headers, function (err) {
    if (err) throw err;
  });

  state.topology = mock_topology;
  console.log('[PING].[MOCK ONLY] Topology Initialized');
  // async function update_topology() {
  //   clearInterval(state.interval_id_topology)
  // }
  // update_topology().catch((e) => console.log(e));
  // state.interval_id_topology = setInterval(
  //   update_topology,
  //   TOPOLOGY_UPDATE_INTERVAL * 1000,
  // );
}

function initialize_express({device_added, device_removed}) {
  console.log('[Express] Initialized');
  const app = express();
  const PORT = 8000;
  app.use(cors());
  app.use(express.json());
  app.use(express.static('./output'));

  function logger(req, res, next) {
    // console.log(`[Express] ${req.method} ${req.path}`);
    next();
  }
  app.use(logger);

  app.post('/led', (req, res) => {
    console.log(`[Express] ${req.method} ${req.path}`);
    const {ip_address, rled_state, gled_state} = req.body;
    let target_node = state.topology.nodes.find(node => node.data.id === ip_address);
    if (target_node === undefined) {
      res.json({success: false});
      return;
    }
    target_node.data['rled_state'] = rled_state;
    target_node.data['gled_state'] = gled_state;
    console.log(target_node);
    res.json({success: true});
  });

  app.get('/topology', (req, res) => {
    res.json(state.topology);
  });

  function append_ping_record_to_csv(ping_record) {
    let {id, source_ip, dest_ip, start, duration, packet_size, was_success} = ping_record;
    start = start.replace(',', '');
    const row_string =
      [id, source_ip, dest_ip, start, duration, packet_size, was_success].join(',') + '\n';
    fs.appendFile(output_file_path, row_string, function (err) {
      if (err) {
        console.log(err);
      }
    });
  }

  app.post('/pingbursts', (req, res) => {
    const pingburst_request = req.body;
    const id = state.pingbursts.length;
    const pingburst = {
      id,
      num_packets_requested: pingburst_request.num_packets,
      records: [],
    };
    const n = pingburst_request.num_packets;
    const interval = pingburst_request.interval;
    const timeout = pingburst_request.timeout;
    function get_mock_ping_result() {
      random_num = Math.random() - 0.25;
      let duration = 0;
      let was_success = true;
      if (random_num < 0) {
        duration = -1;
        was_success = false;
      } else {
        duration = Math.floor(random_num * 100);
        was_success = true;
      }
      return {duration, was_success};
    }

    repeat_n_times(
      n,
      interval,
      (dest_ip, size, records) => {
        ({duration, was_success} = get_mock_ping_result());
        ping_record = {
          id,
          source_ip: state.source_ip,
          dest_ip,
          start: timestamp(),
          duration,
          packet_size: size,
          was_success,
        };
        append_ping_record_to_csv(ping_record);
        records.push(ping_record);
      },
      pingburst_request.dest_ip,
      pingburst_request.packet_size,
      pingburst.records
    );
    state.pingbursts.push(pingburst);
    res.json({id});
  });

  app.get('/pingbursts/:id', (req, res) => {
    pingburst_id = req.params.id;
    res.json(state.pingbursts[pingburst_id]);
  });
  app.get('/pingbursts', (req, res) => {
    res.json(state.pingbursts);
  });
  app.get('/gw_bringup', (req, res) => {
    res.json(state.connected);
  });

  //MOCK GW Bringup
  app.get('/mock_connect', (req, res) => {
    device_added();
    res.send('CONNECTED');
  });

  app.get('/mock_disconnect', (req, res) => {
    device_removed();
    res.send('DISCONNECTED');
  });

  // example query ?property=NCP:TXPower
  app.get('/getProp', (req, res) => {
    res.send({
      [req.query.property]: getProp(req.query.property),
    });
  });
  app.get('/getProps', (req, res) => {
    res.send(getProps());
  });
  // example query ?property=NCP:TXPower
  app.get('/updateProp', (req, res) => {
    updateProp(req.query.property);
    res.send('update success');
  });
  app.get('/updateProps', (req, res) => {
    updateProps();
    res.send('update success');
  });
  app.get('/ready', (req, res) => {
    res.json(state.ready);
  });
  // example query ?property=NCP:TWPower&newValue=10
  app.get('/setProp', (req, res) => {
    setProp(req.query.property, req.query.newValue);
    res.send('set success');
  });
  // example query ?newValue=2020abcd21124b00&insert=false
  app.get('/macfilterlist', (req, res) => {
    //TODO properly mock macfilterlist ... not sure of correct output
    if (req.query.insert == 'true') {
      //push new mac
    } else if (req.query.insert == 'false') {
      //remove mac
    }
    res.send('mac change success');
  });

  app.listen(PORT, () => {
    console.log(`[Express] Listening on http://localhost:${PORT}`);
  });
}

//gw bringup
function initialize_gw_bringup() {
  console.log('[GW BRINGUP] Initialized');
  function device_added() {
    console.log('[GW BRINGUP] Border router connected');
    start_wfantund();
    state.connected = true;
    state.interval_id_ping = setInterval(setup, 1000);
  }

  function device_removed() {
    console.log('[GW BRINGUP] Border router disconnected');
    state.connected = false;
    state.ready = false;
    state.topology = {nodes: [], edges: []};
    // clearInterval(state.interval_id_topology);
  }

  function start_wfantund() {
    console.log('[GW BRINGUP] Starting wfantund');
  }

  return {device_added, device_removed};
}
function setup() {
  state.source_ip = '2020::A';
  initialize_ping();
  state.ready = true;
  clearInterval(state.interval_id_ping);
}
function main() {
  const callbacks = initialize_gw_bringup();
  initialize_express(callbacks);
}

main();
