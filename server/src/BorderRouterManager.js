const {
  ClientState,
  getLatestProp,
  resetNCPPropertyValues,
  resetTopology,
} = require('./ClientState');
const chokidar = require('chokidar');
const SerialPort = require('serialport');
const {borderRouterLogger} = require('./logger');
const {WfantundManager} = require('./WfantundManager');
const {CONSTANTS} = require('./AppConstants');
const {getLatestTopology} = require('./topology');

/**
 *
 * manages connection and lifecyle of a border router
 * This includes
 * starting/stopping  wfantund
 * watching /dev/ttyACMX
 * updating NCP properties
 *
 */
class BorderRouterManager {
  constructor() {
    this.watcher = chokidar.watch(CONSTANTS.BR_FILE_PATH, {
      ignored: /^\./,
      persistent: true,
      ignorePermissionErrors: true,
    });
    this.wfantundManager = new WfantundManager();
    this.ncpPropertyUpdateIntervalID;
    this.watcher
      .on('add', this.deviceAdded)
      .on('unlink', this.deviceRemoved)
      .on('error', function (error) {
        borderRouterLogger.error(error);
      });
  }

  set connected(newConnectionStatus) {
    ClientState.connected = newConnectionStatus;
  }
  get connected() {
    return ClientState.connected;
  }

  deviceAdded = () => {
    borderRouterLogger.info('Border router connected');
    //TODO determine beahvior in the event that wfantund errors out (crashes)
    this.wfantundManager.start();
    this.connected = true;
    this.updateNCPProperties();
    this.updateTopology();
    this.ncpPropertyUpdateIntervalID = setInterval(
      this.updateNCPProperties,
      CONSTANTS.PROPERTY_UPDATE_INTERVAL
    );
    this.topologyUpdateIntervalID = setInterval(
      this.updateTopology,
      CONSTANTS.TOPOLOGY_UPDATE_INTERVAL
    );
  };

  deviceRemoved = () => {
    clearInterval(this.ncpPropertyUpdateIntervalID);
    clearInterval(this.topologyUpdateIntervalID);
    borderRouterLogger.info('Border router disconnected');
    this.connected = false;
  };

  updateNCPProperties = async () => {
    for (const property in ClientState.ncpProperties) {
      try {
        let propertyValue = await getLatestProp(property);
        if (JSON.stringify(propertyValue) !== JSON.stringify(ClientState.ncpProperties[property])) {
          ClientState.ncpProperties[property] = propertyValue;
        }
      } catch (error) {
        borderRouterLogger.debug(`Failed to update property: ${property}. ${error}`);
      }
    }
  };
  updateTopology = async () => {
    try {
      const newTopology = await getLatestTopology(ClientState);
      if (newTopology === undefined) {
        return;
      }
      if (JSON.stringify(newTopology) !== JSON.stringify(ClientState.topology)) {
        borderRouterLogger.info('TOPOLOGY CHANGED');
        Object.assign(ClientState.topology, newTopology);
      }
    } catch (error) {
      borderRouterLogger.debug(`Failed to update Topology. ${error}`);
    }
  };

  reset = async () => {
    return new Promise(async (resolve, reject) => {
      if (!this.connected) {
        reject('BR not Connected. Cannot Reset');
      }
      if (this.wfantundManager.isRunning()) {
        try {
          await this.wfantundManager.kill();
        } catch (e) {
          reject(e);
        }
      }
      resetNCPPropertyValues();
      resetTopology();
      const port = new SerialPort(CONSTANTS.BR_FILE_PATH, {baudRate: 115200}, err => {
        if (err) {
          borderRouterLogger.error(`Serial Port Error ${err}`);
          return;
        }
        port.write(Buffer.from('7e8101da8b7e', 'hex'), err => {
          if (err) {
            reject('Successfully opened but failed to deliver reset message on Serial Port');
          }
          port.close(err => {
            if (err) {
              borderRouterLogger.error(`Serial Port Error ${err}`);
              reject('Failed to close Serial Port');
            }
            this.wfantundManager.start();
            resolve();
          });
        });
      });
    });
  };

  exit = async () => {
    await this.wfantundManager.kill();
    await this.watcher.close();
  };
}

module.exports = {BorderRouterManager};
