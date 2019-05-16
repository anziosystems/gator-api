"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let keys = {};
exports.keys = keys;
keys.github = {
    clientID: '57c612f6845c1c57b267',
    clientSecret: '67038b4c00ca6de30988cf7b5883f2c4144b7c5b',
    /*
    This is what defined in Github https://github.com/settings/applications/1044626
    http://localhost:3000/auth/github/redirect
  
    For Azure service URL can be https://gator-api.azurewebsites.net/auth/github/redirect
  
    check the protocol in settings https and http
    */
    callbackURL: ' http://localhost:3000/auth/github/redirect',
    session: {
        cookieKey: 'RafatSaroshKey',
    },
};
//# sourceMappingURL=keys.js.map