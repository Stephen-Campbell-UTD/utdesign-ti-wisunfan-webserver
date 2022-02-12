const {wfantundLogger} = require('./logger');
const {spawn} = require('child_process');
const {WFANTUND_PATH, BR_FILE_PATH} = require('./AppConstants');

/**
 * Starts and Manages a wfantund process
 *
 */
class WfantundManager {
  constructor() {
    this.wfantund = null;
  }

  isRunning() {
    return this.wfantund !== null;
  }

  start() {
    wfantundLogger.info('Starting wfantund');
    this.wfantund = spawn(WFANTUND_PATH, ['-s', BR_FILE_PATH]);
    this.wfantund.on('error', () => {
      wfantundLogger.error('Failed to start wfantund');
    });
    this.wfantund.stdout.on('data', data => {
      wfantundLogger.debug(`stdout: ${data}`);
    });
    this.wfantund.stderr.on('data', data => {
      wfantundLogger.info(`stderr: ${data}`);
    });
    this.wfantund.on('close', code => {
      wfantundLogger.info('wfantund is closing');
      this.wfantund = null;
      if (code === 0) {
        wfantundLogger.info(`Exited Successfully`);
      } else {
        wfantundLogger.error(`Exited with code ${code}`);
      }
    });
  }

  kill() {
    return new Promise((resolve, reject) => {
      if (this.wfantund === null) {
        reject('wfantund not running. Cannot kill');
      }
      wfantundLogger.info('Killing wfantund');
      this.wfantund.on('close', code => {
        wfantundLogger.info('wfantund is closing from a kill');
        wfantundLogger.error(`Exited with code ${code}`);
        this.wfantund = null;
        resolve();
      });
      const wasSuccessful = this.wfantund.kill('SIGHUP');
      if (!wasSuccessful) {
        reject('kill unsuccessful');
      }
    });
  }
}
module.exports = {WfantundManager};
