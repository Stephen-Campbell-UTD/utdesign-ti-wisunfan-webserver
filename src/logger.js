const winston = require('winston');
const fs = require('fs');
const path = require('path');
const {format} = winston;
const {combine, label, timestamp, printf, prettyPrint, align, colorize} = format;

const logDirectory = process.env['LOG_PATH'] || './logs';

if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

/*
RFC5424 the syslog levels (what is reference by winston.config.syslog.levels)
{
  emerg: 0,
  alert: 1,
  crit: 2,
  error: 3,
  warning: 4,
  notice: 5,
  info: 6,
  debug: 7
}
*/

function makeLogger(loggerLabel, showOnConsole = true, fileName = 'combined.log') {
  let transports = [];
  const defaultFileTransport = new winston.transports.File({
    filename: path.join(logDirectory, fileName),
    options: {flags: 'w'}, //overwrites current log
    format: combine(
      label({label: loggerLabel}),
      timestamp({format: 'YYYY.MM.DD HH:mm:ss'}),
      align(),
      prettyPrint(),
      printf(info => `[${info.timestamp} - ${info.level}] <${info.label}> ${info.message}`)
    ),
  });
  transports.push(defaultFileTransport);
  const defaultConsoleTransport = new winston.transports.Console({
    level: process.env['LOG_LEVEL'] || 'info',
    format: combine(
      label({label: loggerLabel}),
      colorize(),
      timestamp({format: 'YYYY.MM.DD HH:mm:ss'}),
      prettyPrint(),
      printf(info => `[${info.timestamp} - ${info.level}] <${info.label}> ${info.message}`)
    ),
  });
  if (showOnConsole) {
    transports.push(defaultConsoleTransport);
  }
  winston.loggers.add(loggerLabel, {
    levels: winston.config.syslog.levels,
    transports,
  });
  return winston.loggers.get(loggerLabel);
}
const dbusLogger = makeLogger('DBUS');
const httpLogger = makeLogger('HTTP');
const topologyLogger = makeLogger('TOPOLOGY');
const pingLogger = makeLogger('PING');
const wfantundLogger = makeLogger('WFANTUND', false, 'wfantund.log');
const gwBringupLogger = makeLogger('GW_BRINGUP');
const appStateLogger = makeLogger('APP_STATE');

module.exports = {
  dbusLogger,
  httpLogger,
  pingLogger,
  topologyLogger,
  wfantundLogger,
  gwBringupLogger,
  appStateLogger,
};
