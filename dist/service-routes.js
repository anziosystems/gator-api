"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//https://www.youtube.com/watch?v=or1_A4sJ-oY
const router = require('express').Router();
const sqlRepository_1 = require("./Lib/sqlRepository");
const gitRepository_1 = require("./Lib/gitRepository");
let sqlRepositoy = new sqlRepository_1.SQLRepository(null);
let gitRepository = new gitRepository_1.GitRepository();
const jwt = require('jsonwebtoken');
const verifyOptions = {
    algorithm: ['RS256'],
};
function checkToken(req, res) {
    try {
        const token = req.headers['authorization'];
        const result = jwt.verify(token, 'JWTSuperSecret', verifyOptions);
        return true;
    }
    catch (ex) {
        return false;
    }
}
//It is a repeate of checktoken for now, but checkToken should go away from here
//
function getTenant(req, res) {
    try {
        const token = req.headers['authorization']; //it is tenantId in header
        const result = jwt.verify(token, 'JWTSuperSecret', verifyOptions);
        if (result)
            return result;
        else {
            return;
        }
    }
    catch (ex) {
        return;
    }
}
router.get('/Namaste', (req, res) => {
    if (!checkToken(req, res)) {
        return res.json('{val: false, code: 404, message: "Auth Failed"}');
    }
    else {
        return res.json({ val: 'Namaste beta' });
    }
});
router.get('/GetHookStatus', (req, res) => {
    if (!checkToken(req, res)) {
        return '{val: false, code: 404, message: "Auth Failed"}';
    }
    const tenantId = getTenant(req, res);
    gitRepository
        .GetHookStatus(tenantId, req.query.org)
        .then(result => {
        /*
      [
      {
          "type": "Organization",
          "id": 100742919,
          "name": "web",
          "active": true,
          "events": [
              "pull_request",
              "push"
          ],
          "config": {
              "content_type": "application/json",
              "secret": "********",
              "url": "https://gitanziohook.azurewebsites.net/api/httptrigger",
              "insecure_ssl": "0"
          },
          "updated_at": "2019-04-08T23:05:07Z",
          "created_at": "2019-04-08T23:05:07Z",
          "url": "https://api.github.com/orgs/LabShare/hooks/100742919",
          "ping_url": "https://api.github.com/orgs/LabShare/hooks/100742919/pings"
      }
  ]
      */
        if (result) {
            return res.json({ val: true });
        }
        else {
            return res.json({ val: false });
        }
        //return res.json(result.recordset);
    })
        .catch(ex => {
        console.log(ex);
        return res.json({ val: false });
    });
});
router.get('/TopDevForLastXDays', (req, res) => {
    if (!checkToken(req, res)) {
        return '{val: false, code: 404, message: "Auth Failed"}';
    }
    if (!req.query.day) {
        req.query.day = '1';
    }
    sqlRepositoy.TopDevForLastXDays(req.query.org, req.query.day).then(result => {
        return res.json(result);
    });
});
/*

PullRequestCountForLastXDays
returns
[
    [
        {
            "Action": "closed",
            "ctr": 27
        },
        {
            "Action": "opened",
            "ctr": 34
        }
    ]
]

*/
router.get('/PullRequestCountForLastXDays', (req, res) => {
    if (!checkToken(req, res)) {
        return '{val: false, code: 404, message: "Auth Failed"}';
    }
    if (!req.query.day) {
        req.query.day = '1';
    }
    const tenantId = getTenant(req, res);
    sqlRepositoy.PullRequestCountForLastXDays(req.query.org, req.query.day).then(result => {
        return res.json(result);
    });
});
router.get('/PullRequestForLastXDays', (req, res) => {
    if (!checkToken(req, res)) {
        return '{val: false, code: 404, message: "Auth Failed"}';
    }
    if (!req.query.day) {
        req.query.day = '1';
    }
    const tenantId = getTenant(req, res);
    sqlRepositoy.PullRequestForLastXDays(tenantId, req.query.day).then(result => {
        return res.json(result);
    });
});
router.get('/GetTopRespositories4XDays', (req, res) => {
    if (!checkToken(req, res)) {
        return '{val: false, code: 404, message: "Auth Failed"}';
    }
    if (!req.query.day) {
        req.query.day = '1';
    }
    const tenantId = getTenant(req, res);
    sqlRepositoy.GetTopRespositories4XDays(req.query.org, req.query.day).then(result => {
        return res.json(result);
    });
});
router.get('/PullRequest4Dev', (req, res) => {
    if (!checkToken(req, res)) {
        return '{val: false, code: 404, message: "Auth Failed"}';
    }
    if (!req.query.day) {
        req.query.day = '1';
    }
    const tenantId = getTenant(req, res);
    sqlRepositoy.PullRequest4Dev(req.query.org, req.query.day, req.query.login, req.query.action, req.query.pageSize).then(result => {
        return res.json(result);
    });
});
//    /GetOrg?tenantId='rsarosh@hotmail.com'&bustTheCache=false&getFromGit = true
router.get('/GetOrg', (req, res) => {
    if (!checkToken(req, res)) {
        return '{val: false, code: 404, message: "Auth Failed"}';
    }
    const tenantId = getTenant(req, res);
    gitRepository.GetOrg(tenantId, req.query.bustTheCache, req.query.getFromGit).then(result => {
        return res.json(result);
    });
});
//    /GetOrg?tenantId='rsarosh@hotmail.com'&Org='LabShare'&bustTheCache=false&getFromGit = true
router.get('/GetRepos', (req, res) => {
    if (!checkToken(req, res)) {
        return '{val: false, code: 404, message: "Auth Failed"}';
    }
    const tenantId = getTenant(req, res);
    gitRepository.GetRepos(tenantId, req.query.org, req.query.bustTheCache, req.query.getFromGit).then(result => {
        if (result) {
            return res.json(result);
        }
    });
});
router.get('/GetPRfromGit', (req, res) => {
    if (!checkToken(req, res)) {
        return '{val: false, code: 404, message: "Auth Failed"}';
    }
    const tenantId = getTenant(req, res);
    gitRepository.GetRepos(tenantId, req.query.org, req.query.bustTheCache, req.query.getFromGit).then(result => {
        for (let i = 0; i < result.length; i++) {
            const res = gitRepository.FillPullRequest(tenantId, req.query.org, result[i].RepoName);
        }
        return res.json(result.length);
    });
});
//  /SetRepoCollection?tenantId=rsarosh@hotmail.com&org=Labshare&repoCollectionName=Collection1&repos=Repo1,Repo2,Repo3
router.get('/SetRepoCollection', (req, res) => {
    const tenantId = getTenant(req, res);
    sqlRepositoy.SetRepoCollection(tenantId, req.query.org, req.query.repoCollectionName, req.query.repos).then(result => {
        return res.json(result);
    });
});
router.get('/GetAllRepoCollection4TenantOrg', (req, res) => {
    if (!checkToken(req, res)) {
        return '{val: false, code: 404, message: "Auth Failed"}';
    }
    const tenantId = getTenant(req, res);
    sqlRepositoy.GetAllRepoCollection4TenantOrg(tenantId, req.query.org, req.query.bustTheCache).then(result => {
        return res.json(result);
    });
});
//collectionName
router.get('/GetRepoCollectionByName', (req, res) => {
    if (!checkToken(req, res)) {
        return '{val: false, code: 404, message: "Auth Failed"}';
    }
    sqlRepositoy.GetAllRepoCollection4TenantOrg(req.query.collectionName, req.query.bustTheCache).then(result => {
        return res.json(result.recordset);
    });
});
router.get('/SetupWebHook', (req, res) => {
    if (!checkToken(req, res)) {
        return '{val: false, code: 404, message: "Auth Failed"}';
    }
    const tenantId = getTenant(req, res);
    gitRepository.SetupWebHook(tenantId, req.query.org).then(result => {
        return res.json(result);
    });
});
module.exports = router;
//# sourceMappingURL=service-routes.js.map