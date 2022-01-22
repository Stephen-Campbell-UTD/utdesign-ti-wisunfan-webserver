let express = require('express');
let cors = require('cors');
let ping = require('net-ping');
let os = require('os');
const fs = require('fs');
const {exec} = require('child_process');
const {repeatNTimes, timestamp} = require('./utils.js');
let chokidar = require('chokidar');
const {getLatestTopology} = require('./topology.js');
const {
  sendDBusMessage,
  updateProp,
  updateProps,
  setProp,
  getProp,
  getProps,
} = require('./dbusCommands.js');

const TOPOLOGY_UPDATE_INTERVAL = 30;

const interface = process.env.NWP_IFACE;
const outputFilePath = './output/Ping_Results.csv';

const state = {
  connected: false, //gw bringup
  ready: false,
  intervalIDPing: 0,
  intervalIDTopology: 0,
  sourceIP: 'wfan0 interface not found',
  pingbursts: [],
  topology: {nodes: [], edges: []},
};

setInterval(updateProps, 30000);

function initializePing() {
  //creation of the csv file
  const csvHeaders = 'ping_burst_id,sourceIP,destIP,start_time,duration,packetSize,wasSuccess\n';
  fs.writeFile(outputFilePath, csvHeaders, function (err) {
    if (err) throw err;
  });

  state.topology = {nodes: [], edges: []};

  async function updateTopology() {
    console.log('TOPOLOGY', state);
    // if (!state.connected) {
    //   return;
    // }
    try {
      state.topology = await getLatestTopology();
    } catch (e) {
      console.error(e);
    }
  }

  updateTopology().catch(e => console.log(e));
  state.intervalIDTopology = setInterval(updateTopology, TOPOLOGY_UPDATE_INTERVAL * 1000);
}

function initializeExpress() {
  const app = express();
  const PORT = 8000;
  app.use(cors());
  app.use(express.json());
  app.use(express.static('./output'));

  app.post('/led', (req, res) => {
    const {ipAddress, rledState, gledState} = req.body;
    res.json(true);
  });

  app.get('/topology', (req, res) => {
    res.json(state.topology);
  });

  function appendPingRecordToCSV(PingRecord) {
    let {id, sourceIP, destIP, start, duration, packetSize, wasSuccess} = pingRecord;
    start = start.replace(',', '');
    const rowString =
      [id, sourceIP, destIP, start, duration, packetSize, wasSuccess].join(',') + '\n';
    fs.appendFile(outputFilePath, rowString, function (err) {
      if (err) {
        console.log(err);
      }
    });
  }

  app.post('/pingbursts', (req, res) => {
    const pingburstRequest = req.body;
    const id = state.pingbursts.length;
    const pingburst = {
      id,
      numPacketsRequested: pingburstRequest.num_packets,
      records: [],
    };
    const n = pingburstRequest.num_packets;
    const interval = pingburstRequest.interval;
    const timeout = pingburstRequest.timeout;
    repeatNTimes(
      n,
      interval,
      (destIP, size, records) => {
        let ms;
        let session = ping.createSession({
          networkProtocol: ping.NetworkProtocol.IPv4,
          packetSize: size,
          sessionId: process.pid % 65535,
          timeout: timeout,
          ttl: 128,
        });
        session.pingHost(destIP, function (error, destIP, sent, rcvd) {
          ms = rcvd - sent;
          const pingRecord = {
            id,
            sourceIP: state.sourceIP,
            destIP,
            start: timestamp(sent),
            duration: error ? -1 : ms,
            packetSize: size,
            wasSuccess: !error, //js convert to bool
          };
          console.log(pingRecord, error, rcvd);
          records.push(pingRecord);
          appendPingRecordToCSV(PingRecord);
        });
      },
      pingburstRequest.destIP,
      pingburstRequest.packetSize,
      pingburst.records
    );
    state.pingbursts.push(pingburst);
    res.json({id});
  });

  app.get('/pingbursts/:id', (req, res) => {
    pingburstID = req.params.id;
    res.json(state.pingbursts[pingburstID]);
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
function initializeGWBringup() {
  const portPath = '/dev/ttyACM0';
  let watcher = chokidar.watch(portPath, {
    ignored: /^\./,
    persistent: true,
    ignorePermissionErrors: true,
  });

  watcher
    .on('add', deviceAdded)
    .on('unlink', deviceRemoved)
    .on('error', function (error) {
      console.error(error);
    });

  function flashConnectionStatus() {
    console.log('Device connected: ' + state.connected);
  }

  function deviceAdded() {
    console.log('Border router connected');
    startWfantund();
    let intervalID = setInterval(() => {
      try {
        updateProps();
        state.connected = true;
        clearInterval(intervalID);
      } catch (e) {
        console.log(e);
      }
    }, 500);
    state.intervalIDPing = setInterval(setup, 1000);
  }

  function deviceRemoved() {
    console.log('Border router disconnected');
    state.connected = false;
    state.ready = false;
    clearInterval(state.intervalIDTopology);
  }

  function startWfantund() {
    console.log('Starting wfantund');
    exec('sudo wfantund -s ' + portPath, (error, stdout, stderr) => {
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
      state.sourceIP = os.networkInterfaces()[interface][0]['address'];
      initializePing();
      state.ready = true;
      clearInterval(state.intervalIDPing);
    }
  } catch (error) {
    console.log('wfan0 interface not up');
    //state.ready = false
  }
}
function main() {
  initializeGWBringup();
  initializeExpress();
}

main();
