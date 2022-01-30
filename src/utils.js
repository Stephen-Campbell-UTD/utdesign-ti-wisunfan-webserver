function timestamp(date) {
  let dateToFormat = date ? date : new Date();
  return (
    dateToFormat.toLocaleString('en-US', {
      timeZone: 'America/Chicago',
    }) +
    ' ' +
    dateToFormat.getUTCMilliseconds() +
    'ms'
  );
}

function repeatNTimes(func, interval, n, ...args) {
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

function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}
function intervalWithAbort(func, interval, ...args) {
  const intervalID = setInterval(func, interval, ...args);
  return () => {
    clearInterval(intervalID);
    return true;
  };
}

module.exports = {timestamp, repeatNTimes, getKeyByValue, intervalWithAbort};
