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

function repeatNTimes(n, interval, func, ...args) {
  for (let i = 0; i < n; i++) {
    setTimeout(func, interval * i, ...args);
  }
}
function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

module.exports = {timestamp, repeatNTimes, getKeyByValue};
