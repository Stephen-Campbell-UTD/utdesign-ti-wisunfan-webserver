let express = require('express');
let cors = require('cors');
let ping = require('net-ping');
let os = require('os');
const fs = require('fs');
const { exec } = require('child_process');
const { repeat_n_times, timestamp } = require('./utils.js');
let chokidar = require('chokidar');
const { get_latest_topology } = require('./topology.js');
const { sendDBusMessage, updateProp, updateProps,
  setProp, getProp, getProps
} = require('./dbusCommands.js')

const INTERFACE = 'lo';
const TOPOLOGY_UPDATE_INTERVAL = 30;

const state = {
  connected: false, //gw bringup
  source_ip: os.networkInterfaces()[INTERFACE][0]['address'],
  pingbursts: [],
  topology: { nodes: [], edges: [] },
};

function initialize_ping() {
  //creation of the csv file
  const csv_headers =
    'ping_burst_id,source_ip,dest_ip,start_time,duration,packet_size,was_success\n';
  fs.writeFile(
    'output/Ping_Results.csv',
    csv_headers,
    function (err) {
      if (err) throw err;
    },
  );

  setInterval(async () => {
    if (!state.connected) {
      return;
    }
    try {
      state.topology = await get_latest_topology();
    } catch (e) {
      console.error(e);
    }
  }, TOPOLOGY_UPDATE_INTERVAL * 1000);
}

function initialize_express() {
  const app = express();
  const PORT = 8000;
  app.use(cors());
  app.use(express.json());
  app.use(express.static('./output'));

  app.get('/topology', (req, res) => {
    res.json(state.topology);
  });

  function append_ping_record_to_csv(ping_record) {
    let {
      id,
      source_ip,
      dest_ip,
      sent_timestamp,
      duration,
      size,
      was_success,
    } = ping_record;
    sent_timestamp = sent_timestamp.replace(',', '');
    const row_string =
      [
        id,
        source_ip,
        dest_ip,
        start,
        duration,
        size,
        was_success,
      ].join(',') + '\n';
    fs.appendFile('Ping_Results.csv', row_string, function (err) {
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
              was_success: !!error, //js convert to bool
            };
            records.push(ping_record);
            append_ping_record_to_csv(ping_record);
          },
        );
      },
      pingburst_request.dest_ip,
      pingburst_request.packet_size,
      pingburst.records,
    );
    pingbursts.push(pingburst);
    res.json({ id });
  });

  app.get('/pingbursts/:id', (req, res) => {
    pingburst_id = req.params.id;
    res.json(pingbursts[pingburst_id]);
  });
  app.get('/pingbursts', (req, res) => {
    res.json(pingbursts);
  });
  app.get('/gw_bringup', (req, res) => {
    res.json(state.connected);
  });
  // example query ?property=NCP:TXPower
  app.get('/getProp', (req, res) => {
    res.send({
      [req.query.property]: getProp(req.query.property)
    })
  })
  app.get('/getProps', (req, res) => {
    res.send(getProps())
  })
  // example query ?property=NCP:TXPower
  app.get('/updateProp', (req, res) => {
    updateProp(req.query.property)
  })
  app.get('/updateProps', (req, res) => {
    updateProps()
  })
  // example query ?property=NCP:TWPower&newValue=10
  app.get('/setProp', async (req, res) => {
    console.log(req.query);
    await setProp(req.query.property, req.query.newValue)
    console.log('setProp complete');
  })
  // example query ?newValue=2020abcd21124b00&insert=false
  .get('/macfilterlist', (req, res) => {
    if (req.query.insert == 'true') {
      sendDBusMessage('InsertProp', 'macfilterlist', req.query.newValue)
    } else if (req.query.insert == 'false') {
      sendDBusMessage('RemoveProp', 'macfilterlist', req.query.newValue)
    }
  })
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
    ignorePermissionErrors: true
  });

  watcher
    .on('add', device_added)
    .on('unlink', device_removed)
    .on('error', function (error) {
      console.error(error);
    });

  function flash_connection_status() {
    console.log('Device connected: ' + connected);
  }

  function device_added() {
    console.log('Border router connected');
    start_wpantund();
    connected = true;
  }

  function device_removed() {
    console.log('Border router disconnected');
    connected = false;
  }

  function start_wpantund() {
    console.log('Starting wfantund');
    exec(
      'sudo wfantund -s ' + port_path,
      (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
      },
    );
  }
}

function main() {
  // initialize_gw_bringup();
  initialize_ping();
  initialize_express();
}

main();
