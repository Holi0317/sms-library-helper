import * as mongoose from 'mongoose';
import {conn} from './config';

mongoose.Promise = require('bluebird');

let schema = {
  user: new mongoose.Schema({
    tokens: mongoose.Schema.Types.Mixed,
    googleId: String,
    libraryLogin: String,
    libraryPassword: String,
    renewDate: {
      type: Number,
      max: 13,
      min: 2,
      default: 3
    },
    renewEnabled: {
      type: Boolean,
      default: false
    },
    calendarEnabled: {
      type: Boolean,
      default: false
    },
    calendarName: {
      type: String,
      default: 'slh autorenew'
    },
    emailEnabled: {
      type: Boolean,
      default: false
    },
    emailAddress: String,
    isAdmin: {
      type: Boolean,
      default: false
    },
    logs: [{
      time: Date,
      message: String,
      level: {
        type: String,
        enum: 'DEBUG INFO WARN ERROR FATAL SUCCESS'.split(' ')
      }
    }]
  })
};

/**
 * Instance method.
 * Append a log entry into user document.
 * Does NOT perform save action.
 *
 * @param {string} message - Message to be logged.
 * @param {string} [level=DEBUG] - Level of the log message. Valid levels: DEBUG, INFO, WARN, ERROR, FATAL, SUCCESS.
 * They will not be validicated until it is written into database.
 */
schema.user.methods.log = function(message, level) {
  let msg = new Log(message, level);
  this.logs.push(msg);
}

/**
 * Helper class for a log message.
 *
 * @class
 * @private
 * @param {string} message - Message to be logged.
 * @param {string} [level=DEBUG] - Level of the log message. Valid levels: DEBUG, INFO, WARN, ERROR, FATAL, SUCCESS.
 * They will not be validicated until it is written into database.
 *
 * @prop {string} level - Level of the message.
 * @prop {string} message - Message content.
 * @prop {Date} time - Time of this message being created.
 *
 * @alias module:sms-library-helper/backend/models._Log
 */
class Log {
  constructor(message, level) {
    this.level = typeof level !== 'undefined' ?  level : 'INFO';
    this.time = new Date();
    this.message = message;
  }
}

/** Model of the user. */
module.exports.user = conn.model('User', schema.user);
module.exports._schema = schema;
module.exports._Log = Log;