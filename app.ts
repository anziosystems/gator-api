const express = require('express');
const cors = require('cors');
const request = require('request');
const app = express();
const authRoutes = require('./auth-routes');
const serviceRoutes = require('./service-routes');
const cookieSession = require('cookie-session');
const passport = require('passport');
const session = require('express-session');
const bodyParser = require('body-parser');

app.set('view engine', 'ejs');
app.use(cors());
const dotenv = require('dotenv');
dotenv.config();
import {SQLRepository} from './Lib/sqlRepository';

app.use(function(req: any, res: any, next: any) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  res.header('Access-Control-Max-Age', '10');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.use(
  cookieSession({
    key: 'git-user',
    secret: process.env.Session_Key, // keys.github.session.cookieKey,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, //1 day
      secure: false, //https://stackoverflow.com/questions/11277779/Passportjs-deserializeuser-never-called - didn't help though
    },
    httpOnly: false,
  }),
);

app.use(
  session({
    secret: process.env.Session_Key,
    resave: false,
    saveUninitialized: false,
  }),
);

passport.serializeUser((user: any, done: any) => {
  done(null, user);
  //Note if in done you will add full user, then deserializedUser does not get called.
});

passport.deserializeUser(function(id: any, done: any) {
  try {
    // console.log (`==> Inside DeserializeUser - id: ${JSON.stringify(id)}`)
    console.log(`==> Inside DeserializeUser - id: ${id}`);
    const sqlRepositoy = new SQLRepository(null);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    sqlRepositoy.getUser(id).then(result => {
      if (result) {
        console.log('==> inside deserialize - user.id: ' + result[0].Id);
        //do something with Tenant details
        //https://github.com/jaredhanson/passport/issues/6
        done(null, false); //don't care for done. Else pass value in place of false.  // invalidates the existing login session.
      }
      done(null, false); //dont care - really - but necessary
    });
  } catch (ex) {
    console.log(`==> deserializeUser ${ex}`);
  }
});

//initialize Passport
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use('/auth', authRoutes);
app.use('/service', serviceRoutes);

// let jsonParser = bodyParser.json()
// // create application/x-www-form-urlencoded parser
// let urlencodedParser = bodyParser.urlencoded({ extended: false })

app.get('/', (req: any, res: any) => {
  res.render('home');
});
app.get('/success', (req: any, res: any) => {
  res.render('success');
});


// commenting it for https

// const port = process.env.PORT || 3000;
// app.listen(port, () => {
//   console.log('listenting for request on port 3000');
//   console.log('===================================================');
// });

var http = require('http');
var https = require('https');
var fs = require('fs');

var port = process.env.PORT || '3000';
app.set('port', port);

/**
 * Create HTTPS server using TLS cert.
 * NOTE: TLS is required for OIDC callbacks.
 * Listen on provided port, on all network interfaces.
 */
var server;
var protocol = process.env.PROTOCOL || 'http';

if (protocol.toLocaleLowerCase() === 'http') {
  server = http.createServer(app);
} else {
  // For HTTPS read in the key file and cert file.
  server = https.createServer(
    {
      key: fs.readFileSync(process.env.TLS_KEY_FILE),
      cert: fs.readFileSync(process.env.TLS_CERT_FILE),
    },
    app,
  );
}
server.listen(port, function() {
  console.log(`Listening on port ${port}! Go to ${protocol}://${process.env.HOST_NAME}:${port}/`);
});
server.on('error', onError);
server.on('listening', onListening);

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error: any) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(`Port ${port} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`Port ${port} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 * 
 * For https to work on your local machine you have to change host file and add an entry
 * 
 * 127.0.0.1 localhost
 * 
 * copy the host file from C:\Windows\System32\drivers\etc to desktop, edit it and then copy back
 */

function onListening() {
  console.log(`----- I am ready on port ${port} -----`);
}
