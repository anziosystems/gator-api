const express = require('express');
const cors = require('cors');
const app = express();
const authRoutes = require('./auth-routes');
const serviceRoutes = require('./service-routes');

const cookieSession = require('cookie-session');

const session = require('express-session');

app.set('view engine', 'ejs');
app.use(cors());

app.use(function(req: any, res: any, next: any) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  res.header('Access-Control-Max-Age', '10');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// app.use (cookieSession ({
//   keys:keys.github.session.cookieKey,
//   maxAge: 24*60*60*1000
// }));

app.use(
  cookieSession({
    key: 'git-user',
    secret: process.env.Session_Key, // keys.github.session.cookieKey,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, //1 day
      secure: false, //https://stackoverflow.com/questions/11277779/passportjs-deserializeuser-never-called - didn't help though
    },
    httpOnly: false,
  }),
);

app.use(session({secret: 'cats'}));
//initialize passport
app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', authRoutes);
app.use('/service', serviceRoutes);

app.get('/', (req: any, res: any) => {
  res.render('home');
});
app.get('/success', (req: any, res: any) => {
  res.render('success');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('listenting for request on port 3000');
});
