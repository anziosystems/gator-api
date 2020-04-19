//https://www.youtube.com/watch?v=or1_A4sJ-oY
const router = require('express').Router();
const passport = require('passport');
//NOTE - DONT F*** REMOVE THIS unreferenced variable - welcome to JS land - IF below line is removed then passport strategy will not work
const passport_setup = require('./passport-setup');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();
//var callbackURL = 'http://localhost:8080/callback';
const callbackURL = process.env.CALL_BACK_URL; //'https://gator-ui.azurewebsites.net/callback';
//This method is not called any more, it is here for the test
router.get('/login', () => {
    console.log('login is called.');
    return 'login is called';
});
//http://localhost:3000/lsauth
router.get('/lsauth', passport.authenticate('openidconnect', {
    successReturnToOrRedirect: '/',
    scope: 'profile',
}));
router.get('/github', passport.authenticate('github'), () => {
    //This function will never be called.
});
router.get('/atlassian', passport.authenticate('atlassian'), () => {
    //This function will never be called.
});
router.get('/bitbucket', passport.authenticate('bitbucket'), () => {
    //This function will never be called.
});
router.get('/logout', (req, res) => {
    res.send('logging.out');
});
router.get('/lsauth/redirect', passport.authenticate('openidconnect'), (req, res) => {
    console.log(` in lsauth/redirect`);
    const token = jwt.sign(req.user, process.env.Session_Key);
    res.redirect(callbackURL + '?token=' + token);
});
//callback for github to call
//in the setting of application call back is defined as /auth/github/redirect
//remember auth/ is automatically placed in front of this, because in app.ts we have defined
// app.use('/auth', authRoutes);
//this is callbacked with authorization Code, this code is taken by passport and made another call to get the access code
//which you can see in passport-setup.ts file
router.get('/github/redirect', passport.authenticate('github'), (req, res) => {
    const token = jwt.sign(req.user, process.env.Session_Key);
    res.redirect(callbackURL + '?token=' + token);
});
//in the setting of application call back is defined as /auth/atlassian/redirect
router.get('/atlassian/redirect', passport.authenticate('atlassian'), (req, res) => {
    // console.log (`router/atlassian user: ${req.user} `)
    const token = jwt.sign(req.user, process.env.Session_Key);
    const JiraCallbackURL = process.env.CALL_BACK_JIRA_URL;
    res.redirect(JiraCallbackURL + '?JiraToken=' + token);
});
//in the setting of application call back is defined as /auth/atlassian/redirect
router.get('/bitbucket/redirect', passport.authenticate('bitbucket'), (req, res) => {
    // console.log (`router/atlassian user: ${req.user} `)
    const token = jwt.sign(req.user, process.env.Session_Key);
    const cbURL = process.env.CALL_BACK_BITBUCKET_URL;
    res.redirect(cbURL + '?BitBucketToken=' + token);
});
module.exports = router;
//# sourceMappingURL=auth-routes.js.map