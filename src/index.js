let express = require('express');
let cors = require('cors');
let ping = require('net-ping');
let os = require('os');
const fs = require('fs');
const {exec} = require('child_process');
const {intervalWithAbort, repeat_n_times, timestamp} = require('./utils.js');
let chokidar = require('chokidar');
const {get_latest_topology} = require('./topology.js');
const {
  sendDBusMessage,
  updateProp,
  updateProps,
  setProp,
  getProp,
  getProps,
} = require('./dbusCommands.js');
const {updateCoapLed, COAP_LED} = require('./coapLed.js');

const TOPOLOGY_UPDATE_INTERVAL = 30;

const interface = process.env.NWP_IFACE;
const output_file_path = './output/Ping_Results.csv';

const state = {
  connected: false, //gw bringup
  ready: false,
  interval_id_ping: 0,
  interval_id_topology: 0,
  source_ip: 'wfan0 interface not found',
  pingbursts: [],
  topology: {nodes: [], edges: []},
};

setInterval(updateProps, 30000);

function initialize_ping() {
  //creation of the csv file
  const csv_headers =
    'ping_burst_id,source_ip,dest_ip,start_time,duration,packet_size,was_success\n';
  fs.writeFile(output_file_path, csv_headers, function (err) {
    if (err) throw err;
  });

  state.topology = {nodes: [], edges: []};

  async function update_topology() {
    // console.log('TOPOLOGY', JSON.stringify(state));
    // if (!state.connected) {
    //   return;
    // }
    try {
      state.topology = await get_latest_topology();
    } catch (e) {
      console.error(e);
    }
  }

  update_topology().catch(e => console.log(e));
  state.interval_id_topology = setInterval(update_topology, TOPOLOGY_UPDATE_INTERVAL * 1000);
}

function initialize_express() {
  const app = express();
  const PORT = 8000;
  app.use(cors());
  app.use(express.json());
  app.use(express.static('./output'));

  app.post('/led', async (req, res) => {
    const {ip_address, rled_state, gled_state} = req.body;
    console.log('Get /led', ip_address, rled_state, gled_state);
    let target_node = state.topology.nodes.find(node => node.data.id === ip_address);
    if (target_node === undefined) {
      res.json({success: false});
      return;
    }
    try {
      updateCoapLed(ip_address, COAP_LED.RED, rled_state);
      updateCoapLed(ip_address, COAP_LED.GREEN, gled_state);
      target_node.data['rled_state'] = rled_state;
      target_node.data['gled_state'] = gled_state;
      res.json({success: true});
    } catch (e) {
      console.log(e);
      res.json({success: false});
    }
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

  //returns a promise !!this is async!!
  function get_ping_result(pingburst_request) {
    let session = ping.createSession({
      networkProtocol: ping.NetworkProtocol.IPv6,
      packetSize: pingburst_request.packet_size,
      retries: 0,
      sessionId: process.pid % 65535,
      timeout: Number(pingburst_request.timeout),
      ttl: 128,
    });
    return new Promise((resolve, reject) => {
      session.pingHost(pingburst_request.dest_ip, function (error, _, sent, rcvd) {
        let ms = rcvd - sent;
        resolve({
          start: timestamp(sent),
          duration: error ? -1 : ms,
          was_success: !error, //js convert to bool
        });
      });
    });
  }
  async function perform_ping(pingburst_request) {
    ({start, duration, was_success} = await get_ping_result(pingburst_request));
    const {id, dest_ip, packet_size} = pingburst_request;
    let ping_record = {
      id,
      source_ip: state.source_ip,
      dest_ip,
      start,
      duration,
      packet_size,
      was_success,
    };
    append_ping_record_to_csv(ping_record);
    state.pingbursts[pingburst_request.id].records.push(ping_record);
  }

  app.post('/pingbursts', (req, res) => {
    const pingburst_request = req.body;
    const id = state.pingbursts.length;
    pingburst_request['id'] = id;
    const pingburst = {
      id,
      num_packets_requested: pingburst_request.num_packets,
      records: [],
    };
    state.pingbursts.push(pingburst);

    const n = pingburst_request.num_packets;
    const interval = pingburst_request.interval;
    let abort_future_pingbursts = null;
    if (n === '∞') {
      abort_future_pingbursts = intervalWithAbort(perform_ping, interval, pingburst_request);
    } else {
      abort_future_pingbursts = repeat_n_times(perform_ping, interval, n, pingburst_request);
    }
    pingburst['abort_pingburst'] = function () {
      pingburst.was_aborted = true;
      const success = abort_future_pingbursts();
      return success;
    };
    res.json({id});
  });

  app.get('/pingbursts/:id', (req, res) => {
    pingburst_id = req.params.id;
    res.json(state.pingbursts[pingburst_id]);
  });

  app.get('/pingbursts/:id/abort', (req, res) => {
    const pingburst_id = req.params.id;
    const success = state.pingbursts[pingburst_id].abort_pingburst();
    res.json({
      id: pingburst_id,
      was_abort_success: success,
    });
  });

  app.get('/pingbursts', (req, res) => {
    res.json(state.pingbursts);
  });
  app.get('/gw_bringup', (req, res) => {
    res.json(state.connected);
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
  // app.get('/updateProp', (req, res) => {
  //   updateProp(req.query.property);
  // });
  // app.get('/updateProps', (req, res) => {
  //   updateProps();
  // });
  app.get('/ready', (req, res) => {
    res.json(state.ready);
  });
  // example query ?property=NCP:TWPower&newValue=10
  app.get('/setProp', async (req, res) => {
    // console.log(req.query);
    if (state.connected) {
      await setProp(req.query.property, req.query.newValue);
    }
    // console.log('setProp complete');
  });
  // example query ?newValue=2020abcd21124b00&insert=false
  app.get('/macfilterlist', (req, res) => {
    if (state.connected) {
      if (req.query.insert == 'true') {
        sendDBusMessage('InsertProp', 'macfilterlist', req.query.newValue);
      } else if (req.query.insert == 'false') {
        sendDBusMessage('RemoveProp', 'macfilterlist', req.query.newValue);
      }
    }
  });
  app.listen(PORT, () => {
    console.log(`Listening on http://localhost:${PORT}`);
  });
}

//gw bringup
function initialize_gw_bringup() {
  const port_path = '/dev/ttyACM0';
  let watcher = chokidar.watch(port_path, {
    ignored: /^\./,
    persistent: true,
    ignorePermissionErrors: true,
  });

  watcher
    .on('add', device_added)
    .on('unlink', device_removed)
    .on('error', function (error) {
      console.error(error);
    });

  function flash_connection_status() {
    console.log('Device connected: ' + state.connected);
  }

  function device_added() {
    console.log('Border router connected');
    start_wpantund();
    let interval_id = setInterval(() => {
      try {
        updateProps();
        state.connected = true;
        clearInterval(interval_id);
      } catch (e) {
        console.log(e);
      }
    }, 500);
    state.interval_id_ping = setInterval(setup, 1000);
  }

  function device_removed() {
    console.log('Border router disconnected');
    state.connected = false;
    state.ready = false;
    clearInterval(state.interval_id_topology);
  }

  function start_wpantund() {
    console.log('Starting wfantund');
    exec('sudo wfantund -s ' + port_path, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);
    });
  }
}

function setup() {
  try {
    //console.log(os.networkInterfaces()[interface])
    console.log(os.networkInterfaces()[interface][0]['address']);
    if (os.networkInterfaces()[interface] !== undefined) {
      state.source_ip = os.networkInterfaces()[interface][0]['address'];
      initialize_ping();
      state.ready = true;
      clearInterval(state.interval_id_ping);
    }
  } catch (error) {
    console.log('wfan0 interface not up');
    //state.ready = false
  }
}
function main() {
  initialize_gw_bringup();
  initialize_express();
}

main();
