const express = require('express');
const cors = require('cors');
const ping = require('net-ping');
const os = require('os');
const fs = require('fs');
const {Buffer} = require('buffer');
const {spawn} = require('child_process');
const chokidar = require('chokidar');
const SerialPort = require('serialport');
const {repeatNTimes, timestamp, intervalWithAbort} = require('./utils.js');
const {topology, updateTopology} = require('./topology.js');
const {propValues, resetPropValues} = require('./propValues.js');

//this import sets up necessary loggers
const {
  pingLogger,
  httpLogger,
  wfantundLogger,
  gwBringupLogger,
  appStateLogger,
} = require('./logger.js');

const {sendDBusMessage, setProp, getProp, updateProp, getProps} = require('./dbusCommands.js');
const path = require('path');

// const TOPOLOGY_UPDATE_INTERVAL = 30;

const interface = process.env.NWP_IFACE;
const OUTPUT_FILE_PATH = './output/PingResults.csv';
const WFANTUND_PATH = '/usr/local/sbin/wfantund';
const BR_FILE_PATH = '/dev/ttyACM0';

let session = ping.createSession({
  networkProtocol: ping.NetworkProtocol.IPv6,
  packetSize: 50,
  sessionId: process.pid % 65535,
  timeout: 1000,
  ttl: 128,
});

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
};
const state = new Proxy(_state, {
  set: (obj, prop, value) => {
    appStateLogger.info(`${prop} = ${value}`);
    obj[prop] = value;
    return true;
  },
});

function initializePing() {
  //creation of the csv file
  const csvHeaders = 'pingburstID,sourceIP,destIP,start_time,duration,packetSize,wasSuccess\n';
  const outputDir = path.dirname(OUTPUT_FILE_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  fs.writeFile(OUTPUT_FILE_PATH, csvHeaders, function (err) {
    if (err) throw err;
  });
}

async function updateProps() {
  for (const property in propValues) {
    try {
      await updateProp(property);
    } catch (error) {
      appStateLogger.info(`Failed to update property: ${property}. ${error}`);
    }
  }
  try {
    await updateTopology();
  } catch (error) {
    appStateLogger.info(`Failed to update Topology. ${error}`);
  }
}
setInterval(updateProps, 10000);

function startWfantund() {
  gwBringupLogger.info('Starting wfantund');
  state.wfantund = spawn(WFANTUND_PATH, ['-s', BR_FILE_PATH]);
  state.wfantund.stdout.on('data', data => {
    wfantundLogger.debug(`stdout: ${data}`);
  });
  state.wfantund.stderr.on('data', data => {
    wfantundLogger.info(`stderr: ${data}`);
  });
  state.wfantund.on('close', code => {
    gwBringupLogger.info('wfantund is closing');
    state.wfantund = null;
    if (code === 0) {
      wfantundLogger.info(`Exited Successfully`);
    } else {
      wfantundLogger.error(`Exited with code ${code}`);
    }
  });
}
async function killWfantund() {
  return new Promise((resolve, reject) => {
    if (state.wfantund === null) {
      reject('wfantund not running. Cannot kill');
    }
    gwBringupLogger.info('Killing wfantund');
    state.wfantund.on('close', code => {
      gwBringupLogger.info('wfantund is closing from a kill');
      wfantundLogger.error(`Exited with code ${code}`);
      state.wfantund = null;
      resolve();
    });
    const wasSuccessful = state.wfantund.kill('SIGHUP');
    if (!wasSuccessful) {
      reject('kill unsuccessful');
    }
  });
}

async function resetBorderRouter() {
  return new Promise(async (resolve, reject) => {
    if (!state.connected) {
      reject('BR not Connected. Cannot Reset');
    }
    if (state.wfantund) {
      try {
        await killWfantund();
      } catch (e) {
        reject(e);
      }
    }
    resetPropValues();
    const port = new SerialPort(BR_FILE_PATH, {baudRate: 115200}, err => {
      if (err) {
        gwBringupLogger.info(`Serial Port Error ${err}`);
        throw Error('Failed to open Serial Port for Reset');
      }
      port.write(Buffer.from('7e8101da8b7e', 'hex'), err => {
        if (err) {
          reject('Successfully opened but failed to deliver reset message on Serial Port');
        }
        port.close(err => {
          if (err) {
            gwBringupLogger.info(`Serial Port Error ${err}`);
            reject('Failed to close Serial Port');
          }
          startWfantund();
          resolve();
        });
      });
    });
  });
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
    res.json(topology);
  });

  function appendPingRecordToCSV(pingRecord) {
    let {id, sourceIP, destIP, start, duration, packetSize, wasSuccess} = pingRecord;
    start = start.replace(',', '');
    const rowString =
      [id, sourceIP, destIP, start, duration, packetSize, wasSuccess].join(',') + '\n';
    fs.appendFile(OUTPUT_FILE_PATH, rowString, function (err) {
      if (err) {
        appStateLogger.error(err);
      }
    });
  }
  function getPingResult(pingburstRequest) {
    pingLogger.info(`Ping ${JSON.stringify(pingburstRequest)}. `);
    session.timeout = pingburstRequest.timeout;
    session.packetSize = pingburstRequest.packetSize;
    return new Promise((resolve, reject) => {
      session.pingHost(pingburstRequest.destIP, function (error, _, sent, rcvd) {
        let ms = rcvd - sent;
        resolve({
          start: timestamp(sent),
          duration: error ? -1 : ms,
          wasSuccess: !error, //js convert to bool
        });
      });
    });
  }

  async function performPing(pingburstRequest) {
    const {start, duration, wasSuccess} = await getPingResult(pingburstRequest);
    const {id, destIP, packetSize} = pingburstRequest;
    let pingRecord = {
      id,
      sourceIP: state.sourceIP,
      destIP,
      start,
      duration,
      packetSize,
      wasSuccess,
    };
    appendPingRecordToCSV(pingRecord);
    state.pingbursts[pingburstRequest.id].records.push(pingRecord);
  }

  app.post('/pingbursts', (req, res) => {
    const pingburstRequest = req.body;
    const id = state.pingbursts.length;
    pingburstRequest['id'] = id;
    const pingburst = {
      id,
      numPacketsRequested: pingburstRequest.numPackets,
      records: [],
    };
    state.pingbursts.push(pingburst);
    const n = pingburstRequest.numPackets;
    const interval = pingburstRequest.interval;
    let abortFuturePingbursts = null;
    if (n === '∞') {
      abortFuturePingbursts = intervalWithAbort(performPing, interval, pingburstRequest);
    } else {
      abortFuturePingbursts = repeatNTimes(performPing, interval, n, pingburstRequest);
    }
    pingburst['abortPingburst'] = function () {
      pingburst.wasAborted = true;
      const success = abortFuturePingbursts();
      return success;
    };
    res.json({id});
  });

  app.get('/pingbursts/:id/abort', (req, res) => {
    const pingburstID = req.params.id;
    const success = state.pingbursts[pingburstID].abortPingburst();
    res.json({
      id: pingburstID,
      wasAbortSuccess: success,
    });
  });

  app.get('/pingbursts/:id', (req, res) => {
    let pingburstID = req.params.id;
    res.json(state.pingbursts[pingburstID]);
  });
  app.get('/pingbursts', (req, res) => {
    res.json(state.pingbursts);
  });
  app.get('/connected', (req, res) => {
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
  app.get('/reset', async (req, res) => {
    try {
      await resetBorderRouter();
      res.json({wasSuccess: true});
    } catch (e) {
      res.json({wasSuccess: false, message: e.message});
    }
  });
  // example query ?property=NCP:TWPower&newValue=10
  app.get('/setProp', async (req, res) => {
    if (state.connected) {
      try {
        await setProp(req.query.property, req.query.newValue);
        res.json({success: true});
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
  let watcher = chokidar.watch(BR_FILE_PATH, {
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
  }

  watcher
    .on('add', deviceAdded)
    .on('unlink', deviceRemoved)
    .on('error', function (error) {
      gwBringupLogger.error(error);
    });
}

process.on('exit', async code => {
  await killWfantund();
});
function main() {
  initializeGWBringup();
  initializeExpress();
}

main();
