const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const Auth = require('./middleware/auth');
const cookieParser = require('./middleware/cookieParser');
const models = require('./models');

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));



app.get('/', 
(req, res) => {
  // if (!models.Sessions.isLoggedIn()) {
  //   res.redirect('/login');  
  // }
  res.render('index');
});

app.get('/create', 
(req, res) => {
  res.render('index');
});

app.get('/links', 
(req, res, next) => {
  models.Links.getAll()
    .then(links => {
      res.status(200).send(links);
    })
    .error(error => {
      res.status(500).send(error);
    });
});

app.post('/links', 
(req, res, next) => {
  var url = req.body.url;
  if (!models.Links.isValidUrl(url)) {
    // send back a 404 if link is not valid
    return res.sendStatus(404);
  }

  return models.Links.get({ url })
    .then(link => {
      if (link) {
        throw link;
      }
      return models.Links.getUrlTitle(url);
    })
    .then(title => {
      return models.Links.create({
        url: url,
        title: title,
        baseUrl: req.headers.origin
      });
    })
    .then(results => {
      return models.Links.get({ id: results.insertId });
    })
    .then(link => {
      throw link;
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(link => {
      res.status(200).send(link);
    });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.use('/login', cookieParser);

app.use('/login', Auth.createSession);

app.get('/login', 
(req, res) => {
  if (req.authorized) {
    res.redirect('/');
  } else {
    res.render('login');
  }
});

app.post('/login', 
(req, res) => {
  //if (req.headers.cookie)
  //models.Sessions.get({})
  // console.log(req.cookie);
  //see if there's a token in req header cookies, if so:
    //compare to SESSION table to see if it's present
    //if so, log them in
    //if not (aka expired token), or if no token in req header cookie:
      //query USERS table for hash and salt
      //hash req.body.password with salt, compare to USERS table PW hash
      //if matches: generate token salt, hash new token with token salt
      //store username and token in SESSION table
      //store a cookie on client side with token
});

app.get('/signup', 
(req, res) => {
  console.log('COOKIE IS:', req.headers.cookie);
  res.render('signup');
});

app.post('/signup', 
(req, res) => {
  //generate user salt
  // let salt = utils.createRandom32String();
  //hash PW with user salt
  // let hashPW = utils.createHash(req.body.password, salt);
  //create row in USERS table: username, user salt, PW hash
  let token = models.Users.create(req.body)
    .then(thing => thing.insertId)
    .then(thingId => models.Sessions.create(thingId))
    .then(dbTokenResult => models.Sessions.get({id: dbTokenResult.insertId}))
    .then(dbRow => res.cookie('TOKEN', dbRow.hash) && res.cookie('LULZ', 'haha') && res.send());
  //generate token salt, hash new token with token salt
  //store username and token in SESSION table
  //store a cookie on client side with token
  // let token = models.Sessions.create().then((obj) => console.log('HI', obj));
    // still need to add userId here
    
    // res.cookie('TOKEN', HASHED TOKEN VALUE);
  
  //login and return token
});

/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;
