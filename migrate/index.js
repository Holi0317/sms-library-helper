const mongoModel = require('./mongo-model');
const sqlModel = require('./sql-model');

function main() {
  sqlModel.sequelize.sync()
    .then(() => mongoModel.find({}))
    .then(users => {
      console.log('MongoDB query done. Length: ', users.length);
      let promises = [];
      for (let user of users) {
        let userReq = sqlModel.User.create({
          refreshToken: user.tokens.refresh_token,
          accessToken: user.tokens.access_token,
          googleID: user.googleId,
          renewEnabled: user.renewEnabled,
          libraryLogin: user.libraryLogin,
          libraryPassword: user.libraryPassword,
          renewDate: user.renewDate,
          calendarEnabled: user.calendarEnabled,
          calendarName: user.calendarName,
          emailEnabled: user.emailEnabled,
          emailAddress: user.emailAddress,
          isAdmin: user.isAdmin
        });

        let logReq = sqlModel.Logs.bulkCreate(user.logs.map(log => {
          return {
            userID: user.googleId,
            time: log.time,
            message: log.message,
            level: log.level
          }
        }));

        promises.push(userReq);
        promises.push(logReq);

      }
      return Promise.all(promises);
    })
    .then(() => {
      console.log('Done');
      process.exit(0);
    });
}

main();