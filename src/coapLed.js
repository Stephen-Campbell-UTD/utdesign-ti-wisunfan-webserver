const { Buffer } = require('buffer');

const COAP_LED = {
  RED: 0x0,
  GREEN: 0x1,
};

const COAP_NODE_STATE = {
  ON: 0x0,
  OFF: 0x1,
};

function updateCoapLed(targetIP, ledType, shouldIlluminate) {
  //ledType : COAP_LED
  //shouldIlluminate: bool

  const putOptions = {
    observe: false,
    host: targetIP,
    pathname: '/led',
    method: 'put',
    confirmable: 'true',
    retrySend: 'true',
    options: {},
  };
  const putRequest = coap.request(putOptions);
  targetState = shouldIlluminate
    ? COAP_NODE_STATE.ON
    : COAP_NODE_STATE.OFF;

  const payload = Buffer.from[(ledType, targetState)];
  putRequest.write(payload);
  putRequest.end();
  currentLedStates = { rled: null, gled: null };
  putRequest.on('response', (putResponse) => {
    const getOptions = {
      observe: false,
      host: targetIP,
      pathname: '/led',
      method: 'get',
      confirmable: 'true',
      retrySend: 'true',
      options: {},
    };
    const getRequest = coap.request(getOptions);
    getRequest.on('response', (getResponse) => {
      currentLedStates.rled = !!getResponse.payload.readUInt8(0);
      currentLedStates.gled = !!getResponse.payload.readUInt8(1);
      if (
        (ledType === COAP_LED.RED &&
          currentLedStates.rled !== shouldIlluminate) ||
        (ledType === COAP_LED.GREEN &&
          currentLedStates.gled !== shouldIlluminate)
      ) {
        console.log('FAILED TO SET LED STATE');
        throw Error('FAILED TO SET LED STATE');
      }
    });
  });
}

module.exports =  {COAP_LED, COAP_NODE_STATE, updateCoapLed}
