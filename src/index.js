const express = require('express');
const cors = require('cors');
const ping = require('net-ping');
const os = require('os');
const fs = require('fs');
const {spawn} = require('child_process');
const {repeatNTimes, timestamp} = require('./utils.js');
const chokidar = require('chokidar');
const {getLatestTopology} = require('./topology.js');

//this import sets up necessary loggers
const {
  pingLogger,
  httpLogger,
  wfantundLogger,
  gwBringupLogger,
  appStateLogger,
} = require('./logger.js');

const {sendDBusMessage, updateProps, setProp, getProp, getProps} = require('./dbusCommands.js');
const path = require('path');

const TOPOLOGY_UPDATE_INTERVAL = 30;

const interface = process.env.NWP_IFACE;
const OUTPUT_FILE_PATH = './output/Ping_Results.csv';
const WFANTUND_PATH = '/usr/local/sbin/wfantund';

/*
This state variable is simply a wrapper for _state that will log every time a
value is set.  For example, state.ready = true will have the same effect as
_state.ready but will also log that state.ready = true
*/
const _state = {
  connected: false, //gw bringup
  ready: false,
  intervalIDPing: 0,
  intervalIDTopology: 0,
  wfantund: null,
  sourceIP: 'wfan0 interface not found',
  pingbursts: [],
  topology: {nodes: [], edges: []},
};
const state = new Proxy(_state, {
  set: (obj, prop, value) => {
    appStateLogger.info(`${prop} = ${value}`);
    obj[prop] = value;
    return true;
  },
});

setInterval(updateProps, 30000);

function initializePing() {
  //creation of the csv file
  const csvHeaders = 'ping_burst_id,sourceIP,destIP,start_time,duration,packetSize,wasSuccess\n';
  const outputDir = path.dirname(OUTPUT_FILE_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  fs.writeFile(OUTPUT_FILE_PATH, csvHeaders, function (err) {
    if (err) throw err;
  });

  state.topology = {nodes: [], edges: []};

  async function updateTopology() {
    try {
      state.topology = await getLatestTopology();
    } catch (e) {
      gwBringupLogger.error(`Update Topology Error : ${e}`);
    }
  }

  updateTopology().catch(e => pingLogger.error(e));
  state.intervalIDTopology = setInterval(updateTopology, TOPOLOGY_UPDATE_INTERVAL * 1000);
}

function initializeExpress() {
  const app = express();
  const PORT = 8000;
  app.use(cors());
  app.use(express.json());
  app.use(express.static('./output'));
  app.use((req, res, next) => {
    httpLogger.info(`${req.ip} ${req.method} ${req.originalUrl}`);
    next();
  });

  app.post('/led', (req, res) => {
    const {ipAddress, rledState, gledState} = req.body;
    res.json(true);
  });

  app.get('/topology', (req, res) => {
    res.json(state.topology);
  });

  function appendPingRecordToCSV(pingRecord) {
    let {id, sourceIP, destIP, start, duration, packetSize, wasSuccess} = pingRecord;
    start = start.replace(',', '');
    const rowString =
      [id, sourceIP, destIP, start, duration, packetSize, wasSuccess].join(',') + '\n';
    fs.appendFile(OUTPUT_FILE_PATH, rowString, function (err) {
      if (err) {
        pingLogger.error(err);
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
          pingLogger.debug(pingRecord, error, rcvd);
          records.push(pingRecord);
          appendPingRecordToCSV(pingRecord);
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
    let pingburstID = req.params.id;
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
    try {
      const propertyValue = getProp(req.query.property);
      res.json({
        [req.query.property]: propertyValue,
      });
    } catch (error) {
      // e.g. req.query.property isn't a valid property
      res.json({success: false, message: error.message});
    }
  });
  app.get('/getProps', (req, res) => {
    res.send(getProps());
  });

  app.get('/ready', (req, res) => {
    res.json(state.ready);
  });
  // example query ?property=NCP:TWPower&newValue=10
  app.get('/setProp', async (req, res) => {
    if (state.connected) {
      try {
        await setProp(req.query.property, req.query.newValue);
      } catch (error) {
        res.json({success: false, message: error.message});
      }
    } else {
      res.json({success: false, message: 'Border Router Not Connected'});
    }
  });
  // example query ?newValue=2020abcd21124b00&insert=false
  app.get('/macfilterlist', async (req, res) => {
    if (state.connected) {
      if (req.query.insert === 'true') {
        await sendDBusMessage('InsertProp', 'macfilterlist', req.query.newValue);
      } else if (req.query.insert === 'false') {
        await sendDBusMessage('RemoveProp', 'macfilterlist', req.query.newValue);
      }
    }
  });
  app.listen(PORT, () => {
    httpLogger.info(`Listening on http://localhost:${PORT}`);
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

  function setup() {
    try {
      if (interface in os.networkInterfaces()) {
        state.sourceIP = os.networkInterfaces()[interface][0]['address'];
        initializePing();
        state.ready = true;
        clearInterval(state.intervalIDPing);
      }
    } catch (error) {
      gwBringupLogger.info('wfan0 interface not up');
    }
  }
  function startWfantund() {
    gwBringupLogger.info('Starting wfantund');
    state.wfantund = spawn(WFANTUND_PATH, ['-s', portPath]);
    state.wfantund.stdout.on('data', data => {
      wfantundLogger.debug(`stdout: ${data}`);
    });
    state.wfantund.stderr.on('data', data => {
      wfantundLogger.info(`stderr: ${data}`);
    });
    state.wfantund.on('close', code => {
      state.wfantund = null;
      if (code === 0) {
        wfantundLogger.info(`Exited Successfully`);
      } else {
        wfantundLogger.error(`Exited with code ${code}`);
      }
    });
  }

  function deviceAdded() {
    gwBringupLogger.info('Border router connected');
    startWfantund();
    let intervalID = setInterval(() => {
      updateProps();
      state.connected = true;
      clearInterval(intervalID);
    }, 500);
    state.intervalIDPing = setInterval(setup, 1000);
  }

  function deviceRemoved() {
    gwBringupLogger.info('Border router disconnected');
    state.connected = false;
    state.ready = false;
    clearInterval(state.intervalIDTopology);
  }

  watcher
    .on('add', deviceAdded)
    .on('unlink', deviceRemoved)
    .on('error', function (error) {
      gwBringupLogger.error(error);
    });
}

process.on('exit', code => {
  if (state.wfantund !== null) {
    state.wfantund.kill('SIGHUP');
  }
});
function main() {
  initializeGWBringup();
  initializeExpress();
}

main();
