const express = require('express');
const cors = require('cors');
const app = express();
const authRoutes = require('./auth-routes');
const serviceRoutes = require('./service-routes');
const cookieSession = require('cookie-session');
const Passport = require('Passport');
const session = require('express-session');
app.set('view engine', 'ejs');
app.use(cors());
app.use(function (req, res, next) {
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
app.use(cookieSession({
    key: 'git-user',
    secret: process.env.Session_Key,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        secure: false,
    },
    httpOnly: false,
}));
app.use(session({ secret: 'cats' }));
//initialize Passport
app.use(Passport.initialize());
app.use(Passport.session());
app.use('/auth', authRoutes);
app.use('/service', serviceRoutes);
app.get('/', (req, res) => {
    res.render('home');
});
app.get('/success', (req, res) => {
    res.render('success');
});
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log('listenting for request on port 3000');
    console.log('===================================================');
});
//# sourceMappingURL=app.js.map