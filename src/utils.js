function timestamp(date) {
  dateToFormat = date ? date : new Date();
  return (
    dateToFormat.toLocaleString('en-US', {
      timeZone: 'America/Chicago',
    }) +
    ' ' +
    dateToFormat.getUTCMilliseconds() +
    'ms'
  );
}

function repeatNTimes(n, interval, func, ...args) {
  for (let i = 0; i < n; i++) {
    setTimeout(func, interval * i, ...args);
  }
}

module.exports = {timestamp, repeatNTimes};
