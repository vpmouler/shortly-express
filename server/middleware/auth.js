const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {
  if (req.headers.cookie) {
    models.Sessions.get({hash: req.headers.cookie.TOKEN})
    .then(data => req.session = {user: data.user.username})
    .then(() => {
      req.authorized = models.Sessions.isLoggedIn(req.session);
      next();
    });
  } else {
    next();
  }
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

