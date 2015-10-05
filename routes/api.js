'use strict';

let express = require('express');
let router = express.Router();

let google = require('googleapis');
let Promise = require('bluebird');
let config = require('../config');
let models = require('../models');
let libApi = require('../api');

Promise.promisifyAll(google.auth.OAuth2.prototype);

function requireLogin(req, res, next) {
  if (!req.session.tokens) {
    // No token
    return res.redirect('login');
  } else {
    return next();
  }
}


router.get('/login', (req, res) => {
  if (req.session.tokens) {
    // Logined. Don't waste resources on these request = =
    return res.redirect('../../ui');
  }
  // Step1, get authorize url
  let oauth2client = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUrl);
  let authUrl = oauth2client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/plus.me']
  });
  res.redirect(authUrl);
});

router.get('/oauth2callback', (req, res) => {
  // OAUTH2 callback
  if (!req.query.code) {
    // Error occured. No code is responsed.
    return res.redirect('../../ui?oauth=fail');
  }

  // Function is not passed through session. So......
  let oauth2client = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUrl);

  // Step2, exchange code
  oauth2client.getTokenAsync(req.query.code)
  .then(function getGoogleId (tokens) {
    req.session.tokens = tokens[0];
    oauth2client.setCredentials(tokens[0]);

    let plus = google.plus('v1');
    let getAsync = Promise.promisify(plus.people.get);

    return getAsync({userId: 'me', auth: oauth2client});
  })
  .then(function makeDBQuery(plusResponse) {
    req.session.name = plusResponse[0].displayName;
    req.session.googleId = plusResponse[0].id;

    return models.user.findOneAndUpdate({
      googleId: req.session.googleId
    }, {
      update: {
        tokens: req.session.tokens,
        $setOnInsert: {
          googleId: req.session.googleId
        }
      }
    }, {
      new: true,
      upsert: true
    })
  })
  .then(function goToMain() {
    return res.redirect('../../ui?oauth=success');
  })
  .catch(err => {
    res.redirect('../../ui?oauth=fail');
    throw err;
  })
});

router.use('/user', requireLogin);

router.route('/user')
.get((req, res) => {
  // Return JSON for informations
  models.user.findOne({
    googleId: req.session.googleId
  })
  .select({
    id_: 0,
    tokens: 0,
    libraryPassword: 0,
    googleId: 0
  })
  .then(result => {
    return res.json({
      name: req.session.name,
      renewEnabled: result.renewEnabled,
      libraryLogin: result.libraryLogin || null,
      logs: result.logs
    });
  })
  .catch(() => {
    return res.status(500).json({
      message: 'Server error.'
    });
  });
})


.post((req, res) => {
  // Update information
  if (!req.is('json')) {
    // Only accept JSON request
    return res.status(406).json({
      message: 'Only accept application/json body request'
    });
  }

  // Serialize
  let body = {
      libraryLogin: (req.body.renewEnabled) ? req.body.libraryLogin: '',
      libraryPassword: (req.body.renewEnabled) ? req.body.libraryPassword: '',
      renewEnabled: req.body.renewEnabled
  };


  // Check if library login id and password is correct.
  if (body.renewEnabled) {
    let userLibrary = new libApi();
    return userLibrary.login(body.libraryLogin, body.libraryPassword)
    .catch(() => {
      return res.status(401).json({
        message: 'Authorization for library system failed. Is your password or Id correct?'
      });
    })
    .done();
  }

  // TODO try if library login is correct.

  models.user.findOne({
    googleId: req.session.googleId
  })
  .then(result => {
    result.libraryLogin = body.libraryLogin || '';
    result.libraryPassword = body.libraryPassword || '';
    result.renewEnabled = body.renewEnabled || false;

    return result.save()
  })
  .then(() => {
    return res.json({
      message: 'Successfuly updated data.'
    });
  })
  .catch(err => {
    res.status(500).json({
      message: 'Server error.'
    });
    throw err;
  });
})


.delete((req, res) => {
  // Remove user
  let oauth2client = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUrl);
  oauth2client.setCredentials(req.session.tokens);

  let session = Promise.promisifyAll(req.session);

  oauth2client.revokeCredentialsAsync()
  .then(function createDropQuery() {
    return models.user.findOne({
      googleId: session.googleId
    })
    .remove();
  })
  .then(session.destroyAsync())
  .then(function response() {
    return res.json({message: 'Delection succeed.'});
  })
  .catch((err) => {
    res.status(500).json({message: 'Delection failed.'});
    throw err;
  });
});

router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({message: 'Server error.'});
    return res.json({
      message: 'Logout succeed.'
    });
  });
});

module.exports = router;
