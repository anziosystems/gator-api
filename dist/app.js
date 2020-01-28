"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require('express');
const cors = require('cors');
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
const sqlRepository_1 = require("./Lib/sqlRepository");
app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST');
    res.header('Access-Control-Max-Age', '10');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});
app.use(cookieSession({
    key: 'git-user',
    secret: process.env.Session_Key,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        secure: false,
    },
    httpOnly: false,
}));
app.use(session({
    secret: process.env.Session_Key,
    resave: false,
    saveUninitialized: false,
}));
passport.serializeUser((user, done) => {
    done(null, user);
    //Note if in done you will add full user, then deserializedUser does not get called.
});
passport.deserializeUser(function (id, done) {
    try {
        console.log(`==> Inside DeserializeUser - id: ${id}`);
        let sqlRepositoy = new sqlRepository_1.SQLRepository(null);
        sqlRepositoy.getTenant(id).then(result => {
            if (result) {
                console.log('==> inside deserialize - user.id: ' + result[0].Id);
                //do something with Tenant details
                //https://github.com/jaredhanson/passport/issues/6
                done(null, false); //don't care for done. Else pass value in place of false.  // invalidates the existing login session.
            }
            done(null, false); //dont care - really - but necessary
        });
    }
    catch (ex) {
        console.log(`==> deserializeUser ${ex}`);
    }
});
//initialize Passport
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use('/auth', authRoutes);
app.use('/service', serviceRoutes);
// let jsonParser = bodyParser.json()
// // create application/x-www-form-urlencoded parser
// let urlencodedParser = bodyParser.urlencoded({ extended: false })
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