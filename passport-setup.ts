import * as passport from 'passport';
const GitHubStrategy = require('passport-github').Strategy;
import {SQLRepository, Tenant, JiraTenant} from './Lib/sqlRepository';
const dotenv = require('dotenv');
dotenv.config();
const AtlassianStrategy = require('passport-atlassian-oauth2');


passport.use(new AtlassianStrategy({
  clientID: process.env.ATLASSIAN_CLIENT_ID,
  clientSecret: process.env.ATLASSIAN_CLIENT_SECRET,
  callbackURL: 'http://localhost:3000/auth/atlassian/redirect',
  scope: 'offline_access read:jira-user read:jira-work manage:jira-configuration write:jira-work',
  audience: 'api.atlassian.com',
  state:'qwe3424242342sdfasdfads',
  response_type: 'code'
},
(accessToken: any, refreshToken: any, profile: any, done: any) => {
  // optionally save profile data to db
  let tenant = new JiraTenant();
  tenant.AuthToken = accessToken;
  // console.log(`==> Jira Toeken:  ${accessToken}  Name: ${profile.displayName}`);
  if (!refreshToken) refreshToken = '';

  tenant.RefreshToken = refreshToken;
  tenant.UserName = profile.displayName;
  tenant.DisplayName = profile.displayName;
  tenant.Id = profile.id.trim();
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
  let sqlRepositoy = new SQLRepository(null);
   sqlRepositoy.saveJiraTenant(tenant).then(result => {
     if (result.message) {
       //if error then pass the error message
       return done(result, String(profile.id).trim());
     }
  //   console.log(`==> passport.use calling done with null, id:  ${profile.id}  Name: ${profile.displayName}`);
     return done(null, String(profile.id).trim());
   });
}
));

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_ClientID, //keys.github.clientID,
      clientSecret: process.env.GITHUB_ClientSecret,
      scope: 'repo user admin:org read:org admin:org_hook admin:repo_hook read:repo_hook write:repo_hook',
    },
    (accessToken: any, refreshToken: any, profile: any, done: any) => {
      //Callback with the accessToken
      // console.log('==> accessToken: ' + accessToken);
      // console.log('==> refreshToken:' + refreshToken);

      let tenant = new Tenant();
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

      let sqlRepositoy = new SQLRepository(null);
      sqlRepositoy.saveTenant(tenant).then(result => {
        if (result.message) {
          //if error then pass the error message
          return done(result, profile.id);
        }
     //   console.log(`==> passport.use calling done with null, id: ${profile.id}`);
        return done(null, String(profile.id));
      });
    },
  ),
);
