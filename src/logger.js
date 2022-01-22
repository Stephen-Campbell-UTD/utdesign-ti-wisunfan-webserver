const winston = require('winston');
const fs = require('fs');
const {path} = require('path');
const {format} = winston;
const {combine, label, timestamp, printf, prettyPrint, align, colorize} = format;

const logDirectory = process.env['LOG_PATH'] || './logs';

if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

function makeLogger(loggerLabel) {
  winston.loggers.add(loggerLabel, {
    format: combine(
      label({label: loggerLabel}),
      timestamp({format: 'YYYY.MM.DD HH:mm:ss'}),
      align(),
      prettyPrint(),
      printf(info => `[${info.timestamp} - ${info.level}] <${info.label}> ${info.message}`)
    ),
    transports: [new winston.transports.File({filename: path.join(logDirectory, 'combined.log')})],
  });
}
makeLogger('DBUS');
makeLogger('HTTP');

module.exports = logger;
