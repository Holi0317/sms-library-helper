/**
 * Debug routes. Should NOT be used in production, I really mean it.
 * @module sms-library-helper/backend/handlers/dev
 * @author Holi0317 <holliswuhollis@gmail.com>
 * @license MIT
 */

'use strict';

let models = require('../models');
let utils = require('../utils');

/**
 * Render debug routing page, which shows operations can be done under develop mode.
 */
module.exports.index = (req, res) => {
  res.render('develop');
};

module.exports.session = {};

/**
 * Returns what session contains as json.
 */
module.exports.session.show = (req, res) => {
  res.json(req.session);
};

/**
 * Destroy session.
 *
 * @throws {Error} - Cannot destroy session.
 */
 module.exports.session.destroy = (req, res) => {
   req.session.destroy(err => {
     if (err) {
       res.status(500).json({
         message: 'Error when destroying session.',
         ok: false
       });
       throw err;
     }
     res.json({
       message: 'success',
       ok: true
     })
   });
 };

/**
 * Create a flash message in session.
 */
module.exports.session.flash = (req, res) => {
  req.session.flash = 'Allo Allo! This is a flash message';
  return res.json({
    message: 'Done',
    ok: true
  });
}

module.exports.db = {};   // Nothing really in db yet. Just a placeholder.

/**
 * List contents in mongoDB users collection and render as json.
 *
 * @throws {Error} - Error when querying.
 */
module.exports.db.users = (req, res) => {
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
}

/**
 * Drop all contents in mongoDB users collection.
 *
 * @throws {Error} - Error when dropping.
 */
module.exports.db.users.drop = (req, res) => {
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
}

module.exports.gapi = {};

/**
 * Revoke Google API access of a user.
 *
 * @throws {Error} - Token not found.
 * @throws {Error} - Cannot revoke.
 */
module.exports.gapi.revoke = (req, res) => {
  if (!req.session.tokens) {
    return res.json({
      message: 'Tokens not found',
      ok: false
    });
  }
  let oauth2client = utils.oauth2clientFactory();
  oauth2client.setCredentials(req.session.tokens);
  oauth2client.revokeCredentials(() => {
    return res.json({
      message: 'Tokens revoked.'
    });
  });
}

/**
 * Render given view.
 *
 * @param {string} template - template file name to be rendered
 */
module.exports.render = (req, res) => {
  return res.render(req.params.template, {basePath: '../../'});
}