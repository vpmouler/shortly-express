const parseCookies = (req, res, next) => {
  if (req.headers.cookie) {
    req.headers.cookie = req.headers.cookie.split('; ')
      .map(cookie => cookie.split('='))
      .reduce((memo, item) => {
        memo[item[0]] = item[1];
        return memo;
      }, {});
  }
  next();
};

module.exports = parseCookies;