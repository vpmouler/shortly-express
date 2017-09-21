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


app.use('/', cookieParser, Auth.createSession); //changed on lunch

app.get('/', 
(req, res) => {
  if (!req.authorized) {
    res.redirect('/login');  
  } else {
    res.render('index');
  }
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

//app.use('/login', cookieParser); //changed on lunch

app.use('/login', cookieParser, Auth.createSession); //changed on lunch

//app.use('/logout', cookieParser);

app.get('/logout', function(req, res) {
  // req.body.username
  // clear session
  console.log(req.headers.cookie);
  if (req.headers.cookie) {
    models.Sessions.delete({hash: req.headers.cookie.TOKEN});
  }
  // remove cookie
  res.clearCookie('TOKEN'); //changed on lunch
  // redirect to signin
  res.redirect('/login');
});

app.get('/login', 
(req, res) => {
  if (req.authorized) { //changed on lunch
    res.redirect('/');
  } else { //changed on lunch
    res.render('login');
  }
});

app.post('/login', 
(req, res) => {
  // get req.body.un & pw
  //TODO: move below into helper (middleware) function:
  var userId;
  models.Users.get({username: req.body.username})
  .then(data => {
    if ( !data ) {
      res.redirect('/signup'); // change to blow up red screen
    } else {
      userId = data.id;
      return models.Users.compare(req.body.password, data.password, data.salt);
    }
  })
  .then(truth => {
    console.log('this is if pw matched and userId', truth, userId);
    if (truth) {
      return models.Sessions.create(userId);
    } else {
      throw 'Password did not match';
    }
  })
  .then(dbTokenResult => models.Sessions.get({id: dbTokenResult.insertId}))
  .then(dbRow => {
    console.log('this is the token hash', dbRow.hash);
    res.cookie('TOKEN', dbRow.hash);
    res.redirect('/');
  })
  .catch(() => res.redirect('/login'));

  // query USERS table for un, pw, salt
  // hash req.body.pw and compare w/ hashed table from query
  // if match, create session & reroute home page
  
  // if not match, route back to login (preferrably red screen blow up)



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
    .then(dbRow => res.cookie('TOKEN', dbRow.hash) && res.redirect('/'));
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
