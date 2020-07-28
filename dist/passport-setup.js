"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const passport = require("passport");
var OidcStrategy = require('passport-openidconnect').Strategy;
const GitHubStrategy = require('passport-github').Strategy;
const sqlRepository_1 = require("./Lib/sqlRepository");
const dotenv = require('dotenv');
dotenv.config();
const AtlassianStrategy = require('passport-atlassian-oauth2');
const BitbucketStrategy = require('passport-bitbucket-oauth2').Strategy;
passport.use(new AtlassianStrategy({
    clientID: process.env.ATLASSIAN_CLIENT_ID,
    clientSecret: process.env.ATLASSIAN_CLIENT_SECRET,
    callbackURL: process.env.CALL_BACK_JIRA_OATH_URL,
    scope: 'offline_access read:jira-user read:jira-work manage:jira-configuration write:jira-work',
    audience: 'api.atlassian.com',
    state: 'qwe3424242342sdfasdfads',
    response_type: 'code',
}, (accessToken, refreshToken, profile, done) => {
    // optionally save profile data to db
    const jiraUser = new sqlRepository_1.JiraUser();
    jiraUser.AuthToken = accessToken;
    // console.log(`==> Jira Toeken:  ${accessToken}  Name: ${profile.displayName}`);
    if (!refreshToken)
        refreshToken = '';
    jiraUser.RefreshToken = refreshToken;
    jiraUser.UserName = profile.displayName;
    jiraUser.DisplayName = profile.displayName;
    jiraUser.Id = String(profile.id).trim();
    jiraUser.Photo = profile.photo;
    jiraUser.Email = profile.email;
    jiraUser.AccessibleResources = profile.accessibleResources;
    // console.log (`==> ${JSON.stringify(profile.accessibleResources)}`);
    /*
console.log (`==> accessibleResources id: ${profile.accessibleResources[0].id} url: ${profile.accessibleResources[0].url} name: ${profile.accessibleResources[0].name}`);
0:Object {id: "0e493c98-6102-463a-bc17-4980be22651b", url: "https://labshare.atlassian.net", name: "labshare", …}
1:Object {id: "93f3c8f7-3351-4c4e-9eb5-65bc7912eddf", url: "https://ncats-nih.atlassian.net", name: "ncats-nih", …}
profile.accessibleResources[0]

  [
    {"id":"0e493c98-6102-463a-bc17-4980be22651b",
    "url":"https://labshare.atlassian.net",
    "name":"labshare",
    "scopes":["manage:jira-configuration","write:jira-work","read:jira-work","read:jira-user"],
    "avatarUrl":"https://site-admin-avatar-cdn.prod.public.atl-paas.net/avatars/240/koala.png"},
    
    {"id":"93f3c8f7-3351-4c4e-9eb5-65bc7912eddf",
    "url":"https://ncats-nih.atlassian.net",
    "name":"ncats-nih",
    "scopes":["manage:jira-configuration","write:jira-work","read:jira-work","read:jira-user"],
    "avatarUrl":"https://site-admin-avatar-cdn.prod.public.atl-paas.net/avatars/240/rocket.png"}
  ]
*/
    //tenant.accessableResources
    //Token is kept decrypted in DB - Catch it here for Postman
    const sqlRepositoy = new sqlRepository_1.SQLRepository(null);
    sqlRepositoy
        .saveJiraUser(jiraUser)
        .then(result => {
        if (result.message) {
            //if error then pass the error message
            return done(result, String(profile.id).trim());
        }
        //   console.log(`==> passport.use calling done with null, id:  ${profile.id}  Name: ${profile.displayName}`);
        return done(null, String(profile.id).trim());
    })
        .catch(err => {
        console.log(`AtlassianStrategy Error: ${err}`);
    });
}));
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_ClientID,
    clientSecret: process.env.GITHUB_ClientSecret,
    //scope: 'repo user admin:org read:org admin:org_hook admin:repo_hook read:repo_hook write:repo_hook',
    //https://developer.github.com/v3/orgs/hooks/
    //no need to have a admin access
    scope: 'repo user read:org read:repo_hook write:repo_hook',
}, (accessToken, refreshToken, profile, done) => {
    //Callback with the accessToken
    // console.log('==> accessToken: ' + accessToken);
    // console.log('==> refreshToken:' + refreshToken);
    const user = new sqlRepository_1.GUser();
    user.AuthToken = accessToken;
    if (!refreshToken)
        refreshToken = '';
    user.RefreshToken = refreshToken;
    user.UserName = profile.username;
    user.DisplayName = profile.displayName;
    user.Id = profile.id;
    user.Photo = '';
    user.Email = '';
    if (Array.isArray(profile.photos)) {
        if (profile.photos.length > 0) {
            if (profile.photos[0]) {
                user.Photo = profile.photos[0].value;
            }
        }
    }
    user.ProfileUrl = profile.profileUrl;
    if (Array.isArray(profile.emails)) {
        if (profile.emails.length > 0) {
            if (profile.emails[0]) {
                user.Email = profile.emails[0].value;
            }
        }
    }
    const sqlRepositoy = new sqlRepository_1.SQLRepository(null);
    //Id	    Email	              UserName	DisplayName	  ProfileUrl	                LastUpdated	            Auth_Token	                                                                                Refresh_Token	Photo
    //1040817	rsarosh@hotmail.com	rsarosh	  Rafat Sarosh	https://github.com/rsarosh	2020-01-26 18:35:16.507	U2FsdGVkX1/Ew4QHRzEs4lDzjSwL3stUR3aJxDUzIaaSTA/CTrQbEUTgnNQDZ/mwLrSfcTb89v7b5S+8VqPgVw==		              https://avatars1.githubusercontent.com/u/1040817?v=4
    sqlRepositoy
        .saveLoggedInUser(user)
        .then(result => {
        if (result.message) {
            //if error then pass the error message
            return done(result, user.Email);
        }
        //   console.log(`==> passport.use calling done with null, id: ${profile.id}`);
        return done(null, user.Email);
    })
        .catch(err => {
        console.log(`saveLoggedInUser Error: ${err}`);
    });
}));
passport.use(new BitbucketStrategy({
    clientID: 'Qpdu83nySQjD3gnpEu',
    clientSecret: 'V2vxgrrSr9uBMXNA9dvaEjaDsXmaRp3Q',
    callbackURL: process.env.CALL_BACK_BITBUCKET_OATH_URL,
}, (accessToken, refreshToken, profile, done) => {
    // optionally save profile data to db
    const jiraUser = new sqlRepository_1.JiraUser();
    jiraUser.AuthToken = accessToken;
    // console.log(`==> Jira Toeken:  ${accessToken}  Name: ${profile.displayName}`);
    if (!refreshToken)
        refreshToken = '';
    jiraUser.RefreshToken = refreshToken;
    jiraUser.UserName = profile.displayName;
    jiraUser.DisplayName = profile.displayName;
    jiraUser.Id = String(profile.id).trim();
    jiraUser.Photo = profile.photo;
    jiraUser.Email = profile.email;
    jiraUser.AccessibleResources = profile.accessibleResources;
    // console.log (`==> ${JSON.stringify(profile.accessibleResources)}`);
    /*
console.log (`==> accessibleResources id: ${profile.accessibleResources[0].id} url: ${profile.accessibleResources[0].url} name: ${profile.accessibleResources[0].name}`);
0:Object {id: "0e493c98-6102-463a-bc17-4980be22651b", url: "https://labshare.atlassian.net", name: "labshare", …}
1:Object {id: "93f3c8f7-3351-4c4e-9eb5-65bc7912eddf", url: "https://ncats-nih.atlassian.net", name: "ncats-nih", …}
profile.accessibleResources[0]

[
  {"id":"0e493c98-6102-463a-bc17-4980be22651b",
  "url":"https://labshare.atlassian.net",
  "name":"labshare",
  "scopes":["manage:jira-configuration","write:jira-work","read:jira-work","read:jira-user"],
  "avatarUrl":"https://site-admin-avatar-cdn.prod.public.atl-paas.net/avatars/240/koala.png"},
  
  {"id":"93f3c8f7-3351-4c4e-9eb5-65bc7912eddf",
  "url":"https://ncats-nih.atlassian.net",
  "name":"ncats-nih",
  "scopes":["manage:jira-configuration","write:jira-work","read:jira-work","read:jira-user"],
  "avatarUrl":"https://site-admin-avatar-cdn.prod.public.atl-paas.net/avatars/240/rocket.png"}
]
*/
    //tenant.accessableResources
    //Token is kept decrypted in DB - Catch it here for Postman
    const sqlRepositoy = new sqlRepository_1.SQLRepository(null);
    sqlRepositoy
        .saveJiraUser(jiraUser)
        .then(result => {
        if (result.message) {
            //if error then pass the error message
            return done(result, String(profile.id).trim());
        }
        //   console.log(`==> passport.use calling done with null, id:  ${profile.id}  Name: ${profile.displayName}`);
        return done(null, String(profile.id).trim());
    })
        .catch(err => {
        console.log(`saveJiraUser - Bitbucket Error: ${err}`);
    });
}));
var anzioStrategy = new OidcStrategy({
    issuer: process.env.OIDC_ISSUER,
    clientID: process.env.OIDC_CLIENT_ID,
    clientSecret: process.env.OIDC_CLIENT_SECRET,
    authorizationURL: process.env.OIDC_BASE_URI + `/authorize`,
    userInfoURL: process.env.OIDC_BASE_URI + `/me`,
    tokenURL: process.env.OIDC_BASE_URI + `/oidc/token`,
    callbackURL: process.env.OIDC_REDIRECT_URI_ANZIO,
    passReqToCallback: true,
    scope: 'email profile openid',
}, function (req, issuer, userId, profile, accessToken, refreshToken, params, done) {
    ProcessLSAuth(req, issuer, userId, profile, accessToken, refreshToken, params, done);
});
exports.anzioStrategy = anzioStrategy;
anzioStrategy.name = 'anzioStrategy';
passport.use(anzioStrategy);
function ProcessLSAuth(req, issuer, userId, profile, accessToken, refreshToken, params, done) {
    req.session.accessToken = accessToken;
    req.session.idToken = params.id_token;
    const user = new sqlRepository_1.GUser();
    user.AuthToken = accessToken;
    console.log(accessToken);
    if (!refreshToken)
        refreshToken = '';
    user.RefreshToken = refreshToken;
    user.UserName = profile._json.username; //email name to keep it unique
    user.DisplayName = profile.displayName;
    user.Id = profile.id;
    user.Photo = '';
    user.Email = profile._json.username;
    user.ProfileUrl = profile.profileUrl;
    const sqlRepositoy = new sqlRepository_1.SQLRepository(null);
    sqlRepositoy
        .saveLoggedInUser(user)
        .then(result => {
        if (result.message) {
            //if error then pass the error message
            return done(result, user.Email);
        }
        let domain = profile._json.username.split('@');
        //Todo: hardcoded for now
        if (domain[1] === 'labshare.org') {
            domain[1] = 'axleinfo.com';
        }
        if (domain[1] === 'labshare.org') {
            domain[1] = 'axleinfo.com';
        }
        sqlRepositoy.saveUserOrg(user.Email, domain[1], 'org').then(res => {
            if (res) {
                console.log('Profile is saved - ' + domain[1]);
            }
        });
        return done(null, String(user.Email.trim()));
    })
        .catch(err => {
        console.log(`saveLoggedInUser Error: ${err}`);
    });
} //funciton
//# sourceMappingURL=passport-setup.js.map