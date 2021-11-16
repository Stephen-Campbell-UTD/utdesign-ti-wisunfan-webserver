let express = require('express');
let cors = require('cors');
let ping = require('net-ping');
let os = require('os');
const fs = require('fs');
const { exec } = require('child_process');
const { repeat_n_times, timestamp } = require('./utils.js');
let chokidar = require('chokidar');
const { get_latest_topology } = require('./topology.js');
const {
  sendDBusMessage,
  updateProp,
  updateProps,
  setProp,
  getProp,
  getProps,
} = require('./dbusCommands.js');
const {
  parseConnectedDevices
} = require('./parsing.js')

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
  topology: { nodes: [], edges: [] },
};

setInterval(updateProps,30000);

function initialize_ping() {
  //creation of the csv file
  const csv_headers =
    'ping_burst_id,source_ip,dest_ip,start_time,duration,packet_size,was_success\n';
  fs.writeFile(output_file_path, csv_headers, function (err) {
    if (err) throw err;
  });

  async function update_topology() {
    console.log('TOPOLOGY', state);
    // if (!state.connected) {
    //   return;
    // }
    try {
      state.topology = await get_latest_topology();
    } catch (e) {
      console.error(e);
    }
  }

  update_topology().catch((e) => console.log(e));
  state.interval_id_topology = setInterval(
    update_topology,
    TOPOLOGY_UPDATE_INTERVAL * 1000,
  );
}

function initialize_express() {
  const app = express();
  const PORT = 8000;
  app.use(cors());
  app.use(express.json());
  app.use(express.static('./output'));

  app.post('/led', (req, res) => {
    const { ip_address, rled_state, gled_state } = req.body;
    res.json(true);
  });

  app.get('/topology', (req, res) => {
    res.json(state.topology);
  });

  function append_ping_record_to_csv(ping_record) {
    let {
      id,
      source_ip,
      dest_ip,
      start,
      duration,
      packet_size,
      was_success,
    } = ping_record;
    start = start.replace(',', '');
    const row_string =
      [
        id,
        source_ip,
        dest_ip,
        start,
        duration,
        packet_size,
        was_success,
      ].join(',') + '\n';
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
    repeat_n_times(
      n,
      interval,
      (dest_ip, size, records) => {
        let ms;
        let session = ping.createSession({
          networkProtocol: ping.NetworkProtocol.IPv4,
          packetSize: size,
          sessionId: process.pid % 65535,
          timeout: timeout,
          ttl: 128,
        });
        session.pingHost(
          dest_ip,
          function (error, dest_ip, sent, rcvd) {
            ms = rcvd - sent;
            const ping_record = {
              id,
              source_ip: state.source_ip,
              dest_ip,
              start: timestamp(sent),
              duration: error ? -1 : ms,
              packet_size: size,
              was_success: !error, //js convert to bool
            };
            console.log(ping_record, error, rcvd);
            records.push(ping_record);
            append_ping_record_to_csv(ping_record);
          },
        );
      },
      pingburst_request.dest_ip,
      pingburst_request.packet_size,
      pingburst.records,
    );
    state.pingbursts.push(pingburst);
    res.json({ id });
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
     if(state.connected){
      await setProp(req.query.property, req.query.newValue);
     }
      // console.log('setProp complete');
    })
    // example query ?newValue=2020abcd21124b00&insert=false
    app.get('/macfilterlist', (req, res) => {
        if(state.connected){
      if (req.query.insert == 'true') {
        sendDBusMessage(
          'InsertProp',
          'macfilterlist',
          req.query.newValue,
        );
      } else if (req.query.insert == 'false') {
        sendDBusMessage(
          'RemoveProp',
          'macfilterlist',
          req.query.newValue,
        );
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
    let interval_id =  setInterval(()=>{
        try{
            updateProps()
            state.connected = true;
            clearInterval(interval_id)
        }catch(e){
            console.log(e)
        }
    },500)
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
      state.source_ip =
        os.networkInterfaces()[interface][0]['address'];
      initialize_ping();
      state.ready = true;
      clearInterval(state.interval_id_ping);
    }
  } catch {
    console.log('wfan0 interface not up');
    //state.ready = false
  }
}
function main() {
  initialize_gw_bringup();
  initialize_express();
}

main();
