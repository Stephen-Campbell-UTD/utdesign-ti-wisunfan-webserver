const ping = require('ping');
const path = require('path');
const fs = require('fs');
const {CONSTANTS} = require('./AppConstants');
const {pingLogger, appStateLogger} = require('./logger.js');
const {ClientState, getNetworkIPInfo} = require('./ClientState');
const {repeatNTimes, timestamp, intervalWithAbort} = require('./utils.js');

class PingExecutor {
  get pingbursts() {
    return ClientState.pingbursts;
  }

  constructor() {
    // this.timeout = 1000
    // this.packetSize = 50
    // try {
    // this.session = ping.createSession({
    //   networkProtocol: ping.NetworkProtocol.IPv6,
    //   packetSize: 50,
    //   sessionId: process.pid % 65535,
    //   timeout: 1000,
    //   ttl: 128,
    // });
    // } catch {
    //   pingLogger.error('Tried to create Ping session and failed. Try running with sudo');
    // }
    const csvHeaders = 'pingburstID,sourceIP,destIP,start_time,duration,packetSize,wasSuccess\n';
    const outputFilePath = path.join(CONSTANTS.OUTPUT_DIR_PATH, CONSTANTS.PING_RESULTS_FILE_NAME);
    fs.writeFile(outputFilePath, csvHeaders, function (err) {
      if (err) throw err;
    });
  }

  appendPingRecordToCSV(pingRecord) {
    let {id, sourceIP, destIP, start, duration, packetSize, wasSuccess} = pingRecord;
    start = start.replace(',', '');
    const rowString =
      [id, sourceIP, destIP, start, duration, packetSize, wasSuccess].join(',') + '\n';
    const outputFilePath = path.join(CONSTANTS.OUTPUT_DIR_PATH, CONSTANTS.PING_RESULTS_FILE_NAME);
    fs.appendFile(outputFilePath, rowString, function (err) {
      if (err) {
        appStateLogger.error(err);
      }
    });
  }

  // pingHost = async destIP => {
  //   return new Promise((resolve, reject) => {

  //     // this.session.pingHost(destIP, function (error, _, sent, rcvd) {
  //     //   let ms = rcvd - sent;
  //     //   resolve({
  //     //     start: timestamp(sent),
  //     //     duration: error ? -1 : ms,
  //     //     wasSuccess: !error, //js convert to bool
  //     //   });
  //     // });
  //   });
  // };

  getPingResult = async pingburstRequest => {
    pingLogger.info(`Ping ${JSON.stringify(pingburstRequest)}. `);
    // return await this.pingHost(pingburstRequest.destIP);

    const start = timestamp(new Date());
    let res = await ping.promise.probe(pingburstRequest.destIP, {
      timeout: pingburstRequest.timeout * 0.001,
      packetSize: pingburstRequest.packetSize,
      v6: true,
    });
    if (res.alive) {
      return {start, duration: res.time, wasSuccess: true};
    } else {
      return {start, duration: -1, wasSuccess: false};
    }
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
    const networkIPInfo = getNetworkIPInfo(ClientState);
    if (networkIPInfo === undefined) {
      pingLogger.info('Tried to start pingburst without border router IP!');
      return -1;
    }
    const {ip: sourceIP} = networkIPInfo;
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
