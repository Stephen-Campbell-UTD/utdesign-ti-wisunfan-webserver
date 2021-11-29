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

function repeat_n_times(func, interval, n, ...args) {
  const timerIds = [];
  for (let i = 0; i < n; i++) {
    const timerId = setTimeout(func, interval * i, ...args);
    timerIds.push(timerId);
  }
  //abort function
  return () => {
    for (let id of timerIds) {
      clearTimeout(id);
    }
    return true;
  };
}

function intervalWithAbort(func, interval, ...args) {
  const intervalID = setInterval(func, interval, ...args);
  return () => {
    clearInterval(intervalID);
    return true;
  };
}

module.exports = { timestamp, repeat_n_times, intervalWithAbort };
