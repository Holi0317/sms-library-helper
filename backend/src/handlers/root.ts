import * as Promise from 'bluebird';

import {Request, Response} from '../IExpress';
import {default as models, Log, UserDocument} from '../models';
import {oauth2clientFactory, BreakSignal} from '../utils';
import validateUser from '../validate/user-update';
import {plusPeopleGet} from '../promisify';

/**
 * Query give googleID and returns data in database.
 *
 * @param {string} googleId - Google ID of user.
 * @returns {Promise} - Resolved value is a user schema queried from database.
 * @see {@link sms-library-helper/backend/models.schema}
 */
function getUserProfile(googleId) {
  return models.findOne({
    googleId: googleId
  })
  .select({
    id_: 0,
    tokens: 0,
    libraryPassword: 0,
    googleId: 0
  });
}

/**
 * Handles index logic.
 * If user is logined, query his/her information and then render user page.
 * Else, render welcome page.
 */
export function index(req, res) {
  if (req.logined) {
    getUserProfile(req.session.googleId)
      .then((result: UserDocument) => {
        result.logs.sort((a, b) => {
          return b.time.getTime() - a.time.getTime();
        });
        return res.render('user', {user: result});
      })
      .catch(() => {
        return res.status(500).render('error');
      });
  } else {
    res.render('index');
  }
}


/**
 * Login page handler.
 * Generates a url for Google OAuth2 process and redirect user to that url.
 */
export function login(req: Request, res: Response) {
  if (req.logined) {
    return res.redirect(req.app.namedRoutes.build('root.index'));
  }
  // Step1, get authorize url
  let oauth2client = oauth2clientFactory();
  let authUrl = oauth2client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  });
  res.redirect(authUrl);
}

/**
 * Handles callback from Google OAuth2 process.
 * This will request for user's Google ID, their name and write into MongoDB.
 * Then redirect them to index page.
 * If any error occured, render auth-fail page.
 */
export function googleCallback(req, res) {
  // OAUTH2 callback
  if (!req.query.code) {
    // Error occured. No code is responsed.
    return res.status(401).render('auth-fail');
  }

  let oauth2client = oauth2clientFactory();

  // Step2, exchange code
  oauth2client.getTokenAsync(req.query.code)
  .then(function getGoogleId(tokens) {
    req.session.tokens = tokens;
    oauth2client.setCredentials(tokens);

    return plusPeopleGet({userId: 'me', auth: oauth2client});
  })
  .then(function makeDBQuery(plusResponse) {
    req.session.name = plusResponse.displayName;
    req.session.googleId = plusResponse.id;

    let email = '';
    if (plusResponse.emails) {
      plusResponse.emails.every(i => {
        if (i.type === 'account') {
          email = i.value;
          return false;
        } else return true;
      });
    }

    return models.findOneAndUpdate({
      googleId: req.session.googleId
    }, {
      $setOnInsert: {
        tokens: req.session.tokens,
        googleId: req.session.googleId,
        emailAddress: email
      }
    }, {
      upsert: true
    })
  })
  .then(ret => {
    if (ret === null) {
      // New user. Show greeting in flash.
    }
    return res.redirect(req.app.namedRoutes.build('root.index'));
  })
  .catch(err => {
    res.status(401).render('auth-fail');
    throw err;
  })
}

export namespace user {
  export function middleware(req, res, next) {
    if (!req.session.tokens) {
      // No token
      return res.redirect(req.app.namedRoutes.build('root.login'));
    } else {
      return next();
    }
  }

  /**
   * Get handler for user.
   * Response with a 405(Not allowed).
   */
  export function get(req, res) {
    return res.status(405);
  }

  /**
   * Post handler for user route.
   * Only accept JSON request. If not, response with 406.
   * This will serialize data, update user's record in database and return result as JSON.
   */
  export function post(req, res) {
    // Update information
    if (!req.is('json')) {
      // Only accept JSON request
      return res.status(406).json({
        message: 'Only accept application/json body request',
        ok: false
      });
    }

    let body = req.body;  // Because I am too lazy to type.

    validateUser(body, req.session.googleId)
      .catch(err => {
        res.status(400).json({
          ok: false,
          message: err.message
        });
        throw new BreakSignal();
      })
      .then(() => {
        let message = new Log('Changed user profile.');

        return models.findOneAndUpdate({
          googleId: req.session.googleId
        }, {
          $set: {
            libraryLogin: body.libraryLogin,
            libraryPassword: body.libraryPassword,
            renewEnabled: body.renewEnabled,
            renewDate: body.renewDate,
            calendarName: body.calendarName,
            calendarEnabled: body.calendarEnabled,
            emailEnabled: body.emailEnabled,
            emailAddress: body.emailAddress
          },
          $push: {
            logs: message
          }
        });
      })
      .then(doc => {
        if (doc) {
          return res.json({
            message: 'Successfuly updated data.',
            ok: true
          });
        } else {
          throw new Error('Document not found.');
        }
      })
      .catch(err => {
        if (err instanceof BreakSignal) {
          // Break because of other factor than server error.
        } else {
          res.status(500).json({
            message: 'Server error.',
            ok: false
          });
        }
      });
  }

  /**
   * Delete method handler for user route.
   * Delete user from database, revoke their Google OAuth2 permission and clear session.
   */
  export function del(req: Request, res: Response) {
    // Remove user
    let oauth2client = oauth2clientFactory();
    oauth2client.setCredentials(req.session.tokens);
    let googleId = req.session.googleId;

    oauth2client.revokeCredentialsAsync()
      .then(() => {
        // Create drop db query
        return models.findOne({
          googleId: googleId
        })
          .remove();
      })
      .then(() => {
        return new Promise(function(resolve, reject) {
          // Express session cannot be promisify-ed by Bluebird. Donno why(Just me being lazy)
          // Quick and dirty promise wrapper for req.session.regenerate
          req.session.regenerate(err => {
            if (err) reject(err)
            else resolve();
          });
        });
      })
      .then(function response() {
        req.session.flash = 'Your account has been delected.';
        return res.json({
          message: 'Delection succeed.',
          ok: true
        });
      })
      .catch((err) => {
        req.session.flash = 'Cannot delete your account due to server issue.';
        res.status(500).json({
          message: 'Delection failed. Server error occured.',
          ok: false
        });
        throw err;
      });
  }
}

/**
 * Logout handler.
 * Just clear session.
 */
export function logout(req: Request, res: Response) {
  req.session.regenerate(err => {
    if (err) return res.status(500).render('error');
    req.session.flash = 'Logout succeed. Hope to see you in the future.';
    return res.redirect(req.app.namedRoutes.build('root.index'));
  });
}

/**
 * Troll.
 */
export function troll(req, res) {
  return res.status(418).render('418');
}
