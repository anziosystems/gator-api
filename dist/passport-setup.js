"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const passport = require("passport");
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
    const tenant = new sqlRepository_1.JiraTenant();
    tenant.AuthToken = accessToken;
    // console.log(`==> Jira Toeken:  ${accessToken}  Name: ${profile.displayName}`);
    if (!refreshToken)
        refreshToken = '';
    tenant.RefreshToken = refreshToken;
    tenant.UserName = profile.displayName;
    tenant.DisplayName = profile.displayName;
    tenant.Id = String(profile.id).trim();
    tenant.Photo = profile.photo;
    tenant.Email = profile.email;
    tenant.AccessibleResources = profile.accessibleResources;
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
        .saveJiraTenant(tenant)
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
    const tenant = new sqlRepository_1.Tenant();
    tenant.AuthToken = accessToken;
    if (!refreshToken)
        refreshToken = '';
    tenant.RefreshToken = refreshToken;
    tenant.UserName = profile.username;
    tenant.DisplayName = profile.displayName;
    tenant.Id = profile.id;
    tenant.Photo = '';
    tenant.Email = '';
    if (Array.isArray(profile.photos)) {
        if (profile.photos.length > 0) {
            if (profile.photos[0]) {
                tenant.Photo = profile.photos[0].value;
            }
        }
    }
    tenant.ProfileUrl = profile.profileUrl;
    if (Array.isArray(profile.emails)) {
        if (profile.emails.length > 0) {
            if (profile.emails[0]) {
                tenant.Email = profile.emails[0].value;
            }
        }
    }
    const sqlRepositoy = new sqlRepository_1.SQLRepository(null);
    //Id	    Email	              UserName	DisplayName	  ProfileUrl	                LastUpdated	            Auth_Token	                                                                                Refresh_Token	Photo
    //1040817	rsarosh@hotmail.com	rsarosh	  Rafat Sarosh	https://github.com/rsarosh	2020-01-26 18:35:16.507	U2FsdGVkX1/Ew4QHRzEs4lDzjSwL3stUR3aJxDUzIaaSTA/CTrQbEUTgnNQDZ/mwLrSfcTb89v7b5S+8VqPgVw==		              https://avatars1.githubusercontent.com/u/1040817?v=4
    sqlRepositoy
        .saveTenant(tenant)
        .then(result => {
        if (result.message) {
            //if error then pass the error message
            return done(result, profile.id);
        }
        //   console.log(`==> passport.use calling done with null, id: ${profile.id}`);
        return done(null, String(profile.id.trim()));
    })
        .catch(err => {
        console.log(`saveTenant Error: ${err}`);
    });
}));
passport.use(new BitbucketStrategy({
    clientID: 'Qpdu83nySQjD3gnpEu',
    clientSecret: 'V2vxgrrSr9uBMXNA9dvaEjaDsXmaRp3Q',
    callbackURL: process.env.CALL_BACK_BITBUCKET_OATH_URL,
}, (accessToken, refreshToken, profile, done) => {
    // optionally save profile data to db
    const tenant = new sqlRepository_1.JiraTenant();
    tenant.AuthToken = accessToken;
    // console.log(`==> Jira Toeken:  ${accessToken}  Name: ${profile.displayName}`);
    if (!refreshToken)
        refreshToken = '';
    tenant.RefreshToken = refreshToken;
    tenant.UserName = profile.displayName;
    tenant.DisplayName = profile.displayName;
    tenant.Id = String(profile.id).trim();
    tenant.Photo = profile.photo;
    tenant.Email = profile.email;
    tenant.AccessibleResources = profile.accessibleResources;
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
        .saveJiraTenant(tenant)
        .then(result => {
        if (result.message) {
            //if error then pass the error message
            return done(result, String(profile.id).trim());
        }
        //   console.log(`==> passport.use calling done with null, id:  ${profile.id}  Name: ${profile.displayName}`);
        return done(null, String(profile.id).trim());
    })
        .catch(err => {
        console.log(`saveJiraTenant Error: ${err}`);
    });
}));
//# sourceMappingURL=passport-setup.js.map