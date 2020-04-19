import * as passport from 'passport';
var OidcStrategy = require('passport-openidconnect').Strategy;
const GitHubStrategy = require('passport-github').Strategy;
import {SQLRepository, Tenant, JiraTenant} from './Lib/sqlRepository';
const dotenv = require('dotenv');
dotenv.config();
const AtlassianStrategy = require('passport-atlassian-oauth2');
const BitbucketStrategy = require('passport-bitbucket-oauth2').Strategy;

passport.use(
  new AtlassianStrategy(
    {
      clientID: process.env.ATLASSIAN_CLIENT_ID,
      clientSecret: process.env.ATLASSIAN_CLIENT_SECRET,
      callbackURL: process.env.CALL_BACK_JIRA_OATH_URL, // 'https://gator-api.azurewebsites.net/auth/atlassian/redirect', //CALL_BACK_JIRA_OATH_URL //  process.env.CALL_BACK_JIRA_URL, //'http://localhost:3000/auth/atlassian/redirect',
      scope: 'offline_access read:jira-user read:jira-work manage:jira-configuration write:jira-work',
      audience: 'api.atlassian.com',
      state: 'qwe3424242342sdfasdfads',
      response_type: 'code',
    },
    (accessToken: any, refreshToken: any, profile: any, done: any) => {
      // optionally save profile data to db
      const tenant = new JiraTenant();
      tenant.AuthToken = accessToken;
      // console.log(`==> Jira Toeken:  ${accessToken}  Name: ${profile.displayName}`);
      if (!refreshToken) refreshToken = '';

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
      const sqlRepositoy = new SQLRepository(null);
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
    },
  ),
);

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_ClientID, //keys.github.clientID,
      clientSecret: process.env.GITHUB_ClientSecret,
      //scope: 'repo user admin:org read:org admin:org_hook admin:repo_hook read:repo_hook write:repo_hook',
      //https://developer.github.com/v3/orgs/hooks/
      //no need to have a admin access
      scope: 'repo user read:org read:repo_hook write:repo_hook',
    },
    (accessToken: any, refreshToken: any, profile: any, done: any) => {
      //Callback with the accessToken
      // console.log('==> accessToken: ' + accessToken);
      // console.log('==> refreshToken:' + refreshToken);

      const tenant = new Tenant();
      tenant.AuthToken = accessToken;
      if (!refreshToken) refreshToken = '';

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

      const sqlRepositoy = new SQLRepository(null);
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
    },
  ),
);

passport.use(
  new BitbucketStrategy(
    {
      clientID: 'Qpdu83nySQjD3gnpEu', //process.env.BITBUCKET_CLIENT_ID,
      clientSecret: 'V2vxgrrSr9uBMXNA9dvaEjaDsXmaRp3Q', //process.env.BITBUCKET_CLIENT_SECRET,
      callbackURL: process.env.CALL_BACK_BITBUCKET_OATH_URL, // 'https://gator-api.azurewebsites.net/auth/atlassian/redirect', //CALL_BACK_JIRA_OATH_URL //  process.env.CALL_BACK_JIRA_URL, //'http://localhost:3000/auth/atlassian/redirect',
      //scope: 'account, team, repository, pullrequest, isues, webhook, email'
    },
    (accessToken: any, refreshToken: any, profile: any, done: any) => {
      // optionally save profile data to db
      const tenant = new JiraTenant();
      tenant.AuthToken = accessToken;
      // console.log(`==> Jira Toeken:  ${accessToken}  Name: ${profile.displayName}`);
      if (!refreshToken) refreshToken = '';

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
      const sqlRepositoy = new SQLRepository(null);
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
    },
  ),
);

//Labshare for AxleInfo
//ClientId: Dw61UVtyPmyFKWPm6tLqh
//Client Secret: d66f4b78-8029-11ea-9ca6-0242ac120003
/**
 * Configure Passport middleware
 */

// Configure the OIDC Strategy for Passport login
// with credentials obtained from the OIDC server
passport.use(
  new OidcStrategy(
    {
      issuer: `https://a.labshare.org/_api/auth/AxelInfo`,
      clientID: `oKU4JSoI3TbvdfYOVwwCR`, //process.env.OIDC_CLIENT_ID,
      clientSecret: `d024ef66-81c9-11ea-9ca6-0242ac120003`, // process.env.OIDC_CLIENT_SECRET,
      authorizationURL: `https://a.labshare.org/_api/auth/AxleInfo/authorize`,
      userInfoURL: `https://a.labshare.org/_api/auth/AxleInfo/me`,
      tokenURL: `https://a.labshare.org/_api/auth/AxleInfo/oidc/token`,
      callbackURL: 'https://local.mylocal.org:3001/auth/lsauth/redirect',
      passReqToCallback: true,
    },
    function(req: any, issuer: string, userId: string, profile: string, accessToken: string, refreshToken: string, params: any, cb: any) {
      console.log('issuer:', issuer);
      console.log('userId:', userId);
      console.log('accessToken:', accessToken);
      console.log('refreshToken:', refreshToken);
      console.log('params:', params);

      // Store the Access Token and ID Token in the request session
      req.session.accessToken = accessToken;
      req.session.idToken = params.id_token;

      return cb(null, profile);
    },
  ),
);

// passport.serializeUser(function (user, done) {
//   done(null, user);
// });

// passport.deserializeUser(function (obj, done) {
//   done(null, obj);
// });
