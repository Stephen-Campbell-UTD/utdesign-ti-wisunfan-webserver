function timestamp(date) {
  date_to_format = date ? date : new Date();
  return (
    date_to_format.toLocaleString('en-US', {
      timeZone: 'America/Chicago',
    }) +
    ' ' +
    date_to_format.getUTCMilliseconds() +
    'ms'
  );
}

function repeat_n_times(n, interval, func, ...args) {
  for (let i = 0; i < n; i++) {
    setTimeout(func, interval * i, ...args);
  }
}

module.exports = {timestamp, repeat_n_times};
