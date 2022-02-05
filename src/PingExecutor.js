const ping = require('net-ping');
const path = require('path');
const fs = require('fs');
const {OUTPUT_FILE_PATH} = require('./AppConstants');
const {pingLogger, appStateLogger} = require('./logger.js');
const {ClientState, getNetworkIPInfo} = require('./ClientState');
const {repeatNTimes, timestamp, intervalWithAbort} = require('./utils.js');

class PingExecutor {
  get pingbursts() {
    return ClientState.pingbursts;
  }

  constructor() {
    this.session = ping.createSession({
      networkProtocol: ping.NetworkProtocol.IPv6,
      packetSize: 50,
      sessionId: process.pid % 65535,
      timeout: 1000,
      ttl: 128,
    });
    const csvHeaders = 'pingburstID,sourceIP,destIP,start_time,duration,packetSize,wasSuccess\n';
    const outputDir = path.dirname(OUTPUT_FILE_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    fs.writeFile(OUTPUT_FILE_PATH, csvHeaders, function (err) {
      if (err) throw err;
    });
  }

  appendPingRecordToCSV(pingRecord) {
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

  pingHost = async destIP => {
    return new Promise((resolve, reject) => {
      this.session.pingHost(destIP, function (error, _, sent, rcvd) {
        let ms = rcvd - sent;
        resolve({
          start: timestamp(sent),
          duration: error ? -1 : ms,
          wasSuccess: !error, //js convert to bool
        });
      });
    });
  };

  getPingResult = async pingburstRequest => {
    pingLogger.info(`Ping ${JSON.stringify(pingburstRequest)}. `);
    this.session.timeout = pingburstRequest.timeout;
    this.session.packetSize = pingburstRequest.packetSize;
    return await this.pingHost(pingburstRequest.destIP);
  };
  abort = pingburstID => {
    const wasSuccess = this.pingbursts[pingburstID].abortPingburst();
    return wasSuccess;
  };

  handleRequest = pingburstRequest => {
    const sourceIP = getNetworkIPInfo(ClientState);
    if (sourceIP === undefined) {
      pingLogger.info('Tried to start pingburst without border router IP!');
      return -1;
    }
    const id = this.pingbursts.length;
    pingburstRequest['id'] = id;
    const pingburst = {
      id,
      numPacketsRequested: pingburstRequest.numPackets,
      records: [],
    };
    this.pingbursts.push(pingburst);
    const n = pingburstRequest.numPackets;
    const interval = pingburstRequest.interval;
    let abortFuturePingbursts = null;
    if (n === '∞') {
      abortFuturePingbursts = intervalWithAbort(this.performPing, interval, pingburstRequest);
    } else {
      abortFuturePingbursts = repeatNTimes(this.performPing, interval, n, pingburstRequest);
    }
    pingburst['abortPingburst'] = function () {
      pingburst.wasAborted = true;
      const success = abortFuturePingbursts();
      return success;
    };
    return id;
  };

  performPing = async pingburstRequest => {
    const {ip: sourceIP} = getNetworkIPInfo(ClientState);
    if (sourceIP === undefined) {
      pingLogger.info('Tried to ping without border router IP!');
      return false;
    }
    const {start, duration, wasSuccess} = await this.getPingResult(pingburstRequest);
    const {id, destIP, packetSize} = pingburstRequest;
    let pingRecord = {
      id,
      sourceIP: sourceIP,
      destIP,
      start,
      duration,
      packetSize,
      wasSuccess,
    };
    this.appendPingRecordToCSV(pingRecord);
    ClientState.pingbursts[pingburstRequest.id].records.push(pingRecord);
    return true;
  };
}

module.exports = {PingExecutor};
