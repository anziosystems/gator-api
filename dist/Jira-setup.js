"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AtlassianStrategy = require('passport-atlassian-oauth2');
const passport = require("passport");
const GitHubStrategy = require('passport-github').Strategy;
const sqlRepository_1 = require("./Lib/sqlRepository");
const dotenv = require('dotenv');
dotenv.config();
passport.use(new AtlassianStrategy({
    clientID: process.env.ATLASSIAN_CLIENT_ID,
    clientSecret: process.env.ATLASSIAN_CLIENT_SECRET,
    callbackURL: 'http://localhost:8080/auth/atlassian/callback',
    scope: 'offline_access read:jira-user',
}, (accessToken, refreshToken, profile, cb) => {
    // optionally save profile data to db
    let tenant = new sqlRepository_1.Tenant();
    tenant.AuthToken = accessToken;
    if (!refreshToken)
        refreshToken = '';
    tenant.RefreshToken = refreshToken;
    tenant.UserName = profile.username;
    tenant.DisplayName = profile.displayName;
    tenant.Id = profile.id;
    tenant.Photo = '';
    tenant.Email = '';
    let sqlRepositoy = new sqlRepository_1.SQLRepository(null);
    // sqlRepositoy.saveJiraTenant(tenant).then(result => {
    //   if (result.message) {
    //     //if error then pass the error message
    //     return done(result, profile.id);
    //   }
    //   console.log(`==> passport.use calling done with null, id: ${profile.id}`);
    //   return done(null, String(profile.id));
    // });
}));
//# sourceMappingURL=Jira-setup.js.map