const express = require('express');
const cors = require('cors');
const {httpLogger} = require('./logger.js');
const {ClientState, setProp} = require('./ClientState.js');
const {PingExecutor} = require('./PingExecutor.js');
const {BorderRouterManager} = require('./BorderRouterManager.js');
const {sendDBusMessage} = require('./dbusCommands.js');

/**
 *
 * @param {*} app
 * @param {PingExecutor} pingExecutor
 * @param {BorderRouterManager} borderRouterManager
 */
function initializeRoutes(app, pingExecutor, borderRouterManager) {
  app.use(cors());
  app.use(express.json());
  app.use(express.static('./output'));
  app.use((req, res, next) => {
    httpLogger.info(`${req.ip} ${req.method} ${req.originalUrl}`);
    next();
  });

  app.get('/topology', (req, res) => {
    res.json(ClientState.topology);
  });

  app.post('/pingbursts', (req, res) => {
    const id = pingExecutor.handleRequest(req.body);
    if (id === -1) {
      res.json({wasSuccess: false, message: 'Border Router does not have IP'});
    } else {
      res.json({id});
    }
  });

  app.get('/pingbursts/:id/abort', (req, res) => {
    const id = req.params.id;
    const wasAbortSuccess = pingExecutor.abort(id);
    res.json({id, wasAbortSuccess});
  });

  app.get('/pingbursts/:id', (req, res) => {
    let pingburstID = req.params.id;
    res.json(ClientState.pingbursts[pingburstID]);
  });
  app.get('/pingbursts', (req, res) => {
    res.json(ClientState.pingbursts);
  });
  app.get('/connected', (req, res) => {
    res.json(ClientState.connected);
  });
  // example query ?property=NCP:TXPower
  app.get('/getProp', (req, res) => {
    const propertyValue = ClientState.ncpProperties[req.query.property];
    if (propertyValue === undefined) {
      res.json({wasSuccess: false});
    } else {
      res.json({
        [req.query.property]: propertyValue,
      });
    }
  });
  app.get('/getProps', (req, res) => {
    res.json(ClientState.ncpProperties);
  });

  app.get('/reset', async (req, res) => {
    try {
      await borderRouterManager.reset();
      res.json({wasSuccess: true});
    } catch (e) {
      res.json({wasSuccess: false, message: e.message});
    }
  });
  // example query ?property=NCP:TWPower&newValue=10
  app.get('/setProp', async (req, res) => {
    if (ClientState.connected) {
      try {
        await setProp(req.query.property, req.query.newValue);
        res.json({wasSuccess: true});
      } catch (error) {
        res.json({wasSuccess: false, message: error.message});
      }
    } else {
      res.json({wasSuccess: false, message: 'Border Router Not Connected'});
    }
  });
  // example query ?newValue=2020abcd21124b00&insert=false
  app.get('/macfilterlist', async (req, res) => {
    if (ClientState.connected) {
      if (req.query.insert === 'true') {
        await sendDBusMessage('InsertProp', 'macfilterlist', req.query.newValue);
      } else if (req.query.insert === 'false') {
        await sendDBusMessage('RemoveProp', 'macfilterlist', req.query.newValue);
      }
    }
  });
}

module.exports = {initializeRoutes};
