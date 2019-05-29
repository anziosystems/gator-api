import * as passport from 'passport';
const GitHubStrategy = require('passport-github').Strategy;
import {SQLRepository, Tenant} from './Lib/sqlRepository';
const express = require('express');
const app = express();

passport.serializeUser((user: any, done) => {
  console.log('inside serialize- userid: ' + user.id);
  done(null, user.id);
  //Note if in done you will add full user, then deserializedUser does not get called.
});

passport.deserializeUser((id: any, done) => {
  try {
    console.log (`Inside DeserializeUser - id: ${id}`);
    let sqlRepositoy = new SQLRepository(null);
    sqlRepositoy.GetTenant(id).then(result => {
      console.log('inside deserialize - user.id: ' + id);
      //do something with Tenant details
      done(null, result);
    });
  } catch (ex) {
    console.log(ex);
  }
});

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_ClientID, //keys.github.clientID,
      clientSecret: process.env.GITHUB_ClientSecret,
      scope: 'repo user admin:org read:org admin:org_hook admin:repo_hook read:repo_hook write:repo_hook',
    },
    (accessToken: any, refreshToken: any, profile: any, done: any) => {
      //Callback with the accessToken
      console.log('accessToken: ' + accessToken);
      console.log('refreshToken:' + refreshToken);
      console.log('profile:' + profile.username);

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
          return done(result, profile);
        }
        return done(null, profile);
      });
    },
  ),
);
