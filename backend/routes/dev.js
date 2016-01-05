'use strict';

// Development routes
let express = require('express');
let router = express.Router();

let google = require('googleapis');
let Promise = require('bluebird');
let models = require('../models');
let config = require('../../config');
let cron = require('../job');

router.get('/', (req, res) => {
  res.render('develop');
});

router.get('/session', (req, res) => {
  res.json(req.session);
});

router.get('/session/destroy', (req, res) => {
  let session = Promise.promisifyAll(req.session);
  session.destroyAsync()
  .then(() => res.json({message: 'success'}))
  .catch(err => {
    res.status(500).json({
      message: 'Error when destroying session'
    });
    throw err;
  });
});

router.get('/db/users', (req, res) => {
  models.user.find()
  .then((data) => {
    return res.json(data);
  })
  .catch((err) => {
    res.status(500).json({
      message: 'Error when quering users.'
    });
    throw err;
  });
});

router.get('/db/users/drop', (req, res) => {
  models.user.remove()
  .then(() => {
    return res.json({
      message: 'Dropped all data in user collection.'
    });
  })
  .catch((err) => {
    res.status(500).json({
      message: 'Error when dropping users.'
    });
    throw err;
  });
});

router.get('/gapi/revoke', (req, res) => {
  if (!req.session.tokens) {
    return res.json({
      message: 'Tokens not found'
    });
  }
  let oauth2client = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUrl);
  oauth2client.setCredentials(req.session.tokens);
  oauth2client.revokeCredentials(() => {
    return res.json({
      message: 'Tokens revoked.'
    });
  });
});

router.get('/cron', (req, res) => {
  cron();
  return res.json({
    message: 'Cron job started'
  });
});

module.exports = router;
