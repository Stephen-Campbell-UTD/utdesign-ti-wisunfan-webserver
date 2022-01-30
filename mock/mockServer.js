let express = require('express');
let cors = require('cors');
let fs = require('fs');
const {repeatNTimes, timestamp, intervalWithAbort} = require('../src/utils.js');
const mockTopology = require('./mockTopology.js');
const propValues = require('./mockPropValues');
const outputFilePath = `${__dirname}/PingResults.csv`;

const TOPOLOGY_UPDATE_INTERVAL = 5;
const state = {
  connected: false, //gw bringup
  ready: false,
  intervalIDPing: 0,
  intervalIDTopology: 0,
  sourceIP: 'wfan0 interface not found',
  pingbursts: [],
  topology: {nodes: [], edges: []},
};

function updateProps() {}
function updateProp(property) {}

function setProp(property, newValue) {
  if (typeof property !== 'undefined' && newValue !== '') {
    propValues[property] = newValue;
  }
}

function getProps() {
  return propValues;
}

function getProp(property) {
  return propValues[property];
}

function initializePing() {
  console.log('[PING] Initialized');
  //creation of the csv file
  const csvHeaders = 'pingBurstId,sourceIP,destIP,startTime,duration,packetSize,wasSuccess\n';
  fs.writeFile(outputFilePath, csvHeaders, function (err) {
    if (err) throw err;
  });

  state.topology = mockTopology;
  console.log('[PING].[MOCK ONLY] Topology Initialized');
  // async function updateTopology() {
  //   clearInterval(state.intervalIDTopology)
  // }
  // updateTopology().catch((e) => console.log(e));
  // state.intervalIDTopology = setInterval(
  //   updateTopology,
  //   TOPOLOGY_UPDATE_INTERVAL * 1000,
  // );
}

function initializeExpress({deviceAdded, deviceRemoved}) {
  console.log('[Express] Initialized');
  const app = express();
  const PORT = 8000;
  app.use(cors());
  app.use(express.json());
  app.use(express.static(__dirname));

  function logger(req, res, next) {
    // console.log(`[Express] ${req.method} ${req.path}`);
    next();
  }
  app.use(logger);

  app.post('/led', (req, res) => {
    console.log(`[Express] ${req.method} ${req.path}`);
    const {ipAddress, rledState, gledState} = req.body;
    let targetNode = state.topology.nodes.find(node => node.data.id === ipAddress);
    if (targetNode === undefined) {
      res.json({success: false});
      return;
    }
    targetNode.data['rledState'] = rledState;
    targetNode.data['gledState'] = gledState;
    console.log(targetNode);
    res.json({success: true});
  });

  app.get('/topology', (req, res) => {
    res.json(state.topology);
  });

  function appendPingRecordToCSV(PingRecord) {
    let {id, sourceIP, destIP, start, duration, packetSize, wasSuccess} = PingRecord;
    start = start.replace(',', '');
    const rowString =
      [id, sourceIP, destIP, start, duration, packetSize, wasSuccess].join(',') + '\n';
    fs.appendFile(outputFilePath, rowString, function (err) {
      if (err) {
        console.log(err);
      }
    });
  }

  function getMockPingResult() {
    let randomNum = Math.random() - 0.25;
    let duration = 0;
    let wasSuccess = true;
    if (randomNum < 0) {
      duration = -1;
      wasSuccess = false;
    } else {
      duration = Math.floor(randomNum * 100);
      wasSuccess = true;
    }
    return {duration, wasSuccess};
  }

  function performPing(pingburstRequest) {
    const {duration, wasSuccess} = getMockPingResult(pingburstRequest);
    const {id, destIP, packetSize} = pingburstRequest;
    let pingRecord = {
      id,
      sourceIP: state.sourceIP,
      destIP,
      start: timestamp(),
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
      wasAborted: false,
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
    console.log(pingburstID);
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

  //MOCK GW Bringup
  app.get('/mockConnect', (req, res) => {
    deviceAdded();
    res.send('CONNECTED');
  });

  app.get('/mockDisconnect', (req, res) => {
    deviceRemoved();
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
    if (req.query.insert === 'true') {
      //push new mac
    } else if (req.query.insert === 'false') {
      //remove mac
    }
    res.send('mac change success');
  });

  app.listen(PORT, () => {
    console.log(`[Express] Listening on http://localhost:${PORT}`);
  });
}
function startWfantund() {
  console.log('[GW BRINGUP] Starting wfantund');
}

function setup() {
  state.sourceIP = '2020::A';
  initializePing();
  state.ready = true;
  clearInterval(state.intervalIDPing);
}

//gw bringup
function initializeGWBringup() {
  console.log('[GW BRINGUP] Initialized');
  function deviceAdded() {
    console.log('[GW BRINGUP] Border router connected');
    startWfantund();
    state.connected = true;
    state.intervalIDPing = setInterval(setup, 1000);
  }

  function deviceRemoved() {
    console.log('[GW BRINGUP] Border router disconnected');
    state.connected = false;
    state.ready = false;
    state.topology = {nodes: [], edges: []};
    // clearInterval(state.intervalIDTopology);
  }

  return {deviceAdded, deviceRemoved};
}
function main() {
  const callbacks = initializeGWBringup();
  initializeExpress(callbacks);
}

main();
