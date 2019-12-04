"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
//https://www.youtube.com/watch?v=or1_A4sJ-oY
const router = require('express').Router();
/*
Jira calls must have following in the header

req.headers['jiraOrg'];  //AccessibleResources Id
req.headers['JiraToken'];  //This is JiraTenant Id
*/
const sqlRepository_1 = require("./Lib/sqlRepository");
const GitRepository_1 = require("./Lib/GitRepository");
const JiraRepository_1 = require("./Lib/JiraRepository");
let sqlRepositoy = new sqlRepository_1.SQLRepository(null);
let gitRepository = new GitRepository_1.GitRepository();
let jiraRepository = new JiraRepository_1.JiraRepository();
const jwt = require('jsonwebtoken');
const verifyOptions = {
    algorithm: ['RS256'],
};
function isTokenValid(tenantId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //Return  false if there is no tenant, true if tenant exist
            return yield sqlRepositoy.checkToken(tenantId).then(r => {
                if (r) {
                    return true;
                }
                else {
                    return false;
                }
            });
        }
        catch (ex) {
            return false;
        }
    });
}
function isJiraTokenValid(tenantId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //Return  false if there is no tenant, true if tenant exist
            return yield sqlRepositoy.checkJiraToken(tenantId).then(r => {
                if (r) {
                    return true;
                }
                else {
                    return false;
                }
            });
        }
        catch (ex) {
            return false;
        }
    });
}
function validateToken(req, res, next) {
    const tenantId = getTenant(req, res); //GetTenantId from req
    isTokenValid(tenantId).then(val => {
        if (!val) {
            return res.json({ val: false, code: 404, message: 'Auth Failed' });
        }
        else {
            next();
        }
    });
}
function validateJiraToken(req, res, next) {
    const tenantId = getJiraTenant(req, res); //GetTenantId from req
    // console.log(`==> validateJiraToken: ${tenantId}`);
    isJiraTokenValid(tenantId).then(val => {
        if (!val) {
            return res.json({ val: false, code: 404, message: 'Jira Auth Failed' });
        }
        else {
            next();
        }
    });
}
function getTenant(req, res) {
    try {
        const token = req.headers['authorization']; //it is tenantId in header
        //
        const result = jwt.verify(token, process.env.Session_Key, verifyOptions);
        if (result)
            return result;
        else {
            return;
        }
    }
    catch (ex) {
        console.log(`==> getTenant ${ex}`);
        return;
    }
}
//token has the tenantId - It always come in authorization header as a token
function getJiraTenant(req, res) {
    try {
        const token = req.headers['authorization'].trim(); //it is tenantId in header
        // console.log(` ==> GetJiraTenant raw token from the call ${token}`);
        const result = jwt.verify(token, process.env.Session_Key, verifyOptions);
        if (result) {
            // console.log(` ==> GetJiraTenant - unencrypted token ${result}`);
            return result;
        }
        else {
            return;
        }
    }
    catch (ex) {
        console.log(`==> getJiraTenant ${ex}`);
        return;
    }
}
function getJiraOrg(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const jiraOrg = req.headers['jiraOrg']; //it is tenantId in header
        if (!jiraOrg) {
            //Oops!lets  get it from the DB
            jiraRepository.getJiraOrg(getJiraTenant(req, res), req.query.bustTheCache).then(result => {
                console.log(`getJiraOrg : result`);
                return res.json(result); //guid string of the AccessResource Id
            });
        }
        else {
            return jiraOrg;
        }
    });
}
//header must have JiraTenant and JiraOrg
router.get('/GetJiraUsers', validateJiraToken, (req, res) => {
    getJiraOrg(req, res).then(jiraOrg => {
        jiraRepository.GetJiraUsers(getJiraTenant(req, res), jiraOrg, req.query.bustTheCache).then(result => {
            return res.json(result);
        });
    });
});
//header must have JiraTenant
router.get('/GetJiraOrgs', validateJiraToken, (req, res) => {
    jiraRepository.getJiraOrgs(getJiraTenant(req, res), req.query.bustTheCache).then(result => {
        /*
          result
          Array(3) [Object, Object, Object]
          result[0]
          Object {id: "0e493c98-6102-463a-bc17-4980be22651b", url: "https://labshare.atlassian.net", name: "labshare", scopes: Array(4), avatarUrl: "https://site-admin-avatar-cdn.prod.public.atl-paas…"}
        */
        return res.json(result); //guid string of the AccessResource Id
    });
});
//header must have JiraTenant
router.get('/GetJiraIssues', validateJiraToken, (req, res) => {
    getJiraOrg(req, res).then(jiraOrg => {
        jiraRepository
            .getJiraIssues(getJiraTenant(req, res), //tenant
        jiraOrg, //org
        '557058:f39310b9-d30a-41a3-8011-6a6ae5eeed07', //userId
        '"In Progress" OR status="To Do"', //status
        'summary,status, assignee,created, updated')
            .then(result => {
            return res.json(result);
        });
    });
});
router.get('/GetOrg', validateToken, (req, res) => {
    gitRepository.getOrg(getTenant(req, res), req.query.bustTheCache, req.query.getFromGit).then(result => {
        return res.json(result);
    });
});
/*
returns {
  [
    {state: 'closed',
     Date = "May 1 2019",
     Ctr = 34
  } ...]
}

*/
router.get('/GetGraphData4XDays', validateToken, (req, res) => {
    sqlRepositoy.GetGraphData4XDays(req.query.org, req.query.day, req.query.bustTheCache).then(result => {
        return res.json(result);
    });
});
router.get('/GetHookStatus', validateToken, (req, res) => {
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
        if (ex) {
            console.log(`==> GetHookStatus ${ex}`);
        }
        return res.json({ val: false });
    });
});
router.get('/GetRepositoryPR', validateToken, (req, res) => {
    sqlRepositoy.getRepoPR(req.query.org, req.query.repo, req.query.day, req.query.pageSize).then(result => {
        return res.json(result);
    });
});
router.get('/TopDevForLastXDays', validateToken, (req, res) => {
    if (!req.query.day) {
        req.query.day = '1';
    }
    sqlRepositoy.getTopDev4LastXDays(req.query.org, req.query.day).then(result => {
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
router.get('/PullRequestCountForLastXDays', validateToken, (req, res) => {
    if (!req.query.day) {
        req.query.day = '1';
    }
    sqlRepositoy.getPRCount4LastXDays(req.query.org, req.query.day).then(result => {
        return res.json(result);
    });
});
router.get('/PullRequestForLastXDays', validateToken, (req, res) => {
    if (!req.query.day) {
        req.query.day = '1';
    }
    sqlRepositoy.getPR4LastXDays(getTenant(req, res), req.query.day).then(result => {
        return res.json(result);
    });
});
router.get('/GetTopRespositories4XDays', validateToken, (req, res) => {
    if (!req.query.day) {
        req.query.day = '1';
    }
    sqlRepositoy.getTopRepo4XDays(req.query.org, req.query.day).then(result => {
        return res.json(result);
    });
});
router.get('/PullRequest4Dev', validateToken, (req, res) => {
    if (!req.query.day) {
        req.query.day = '1';
    }
    sqlRepositoy.getPR4Dev(req.query.org, req.query.day, req.query.login, req.query.action, req.query.pageSize).then(result => {
        return res.json(result);
    });
});
//    /GetOrg?tenantId='rsarosh@hotmail.com'&Org='LabShare'&bustTheCache=false&getFromGit = true
router.get('/GetRepos', validateToken, (req, res) => {
    gitRepository.getRepos(getTenant(req, res), req.query.org, req.query.bustTheCache, req.query.getFromGit).then(result => {
        if (result) {
            return res.json(result);
        }
    });
});
router.get('/GetPRfromGit', validateToken, (req, res) => {
    const tenantId = getTenant(req, res);
    gitRepository.getRepos(tenantId, req.query.org, false, false).then(result => {
        for (let i = 0; i < result.length; i++) {
            const res = gitRepository.fillPullRequest(tenantId, req.query.org, result[i].RepoName);
        }
        return res.json(result.length);
    });
});
router.get('/GetAllRepoCollection4TenantOrg', validateToken, (req, res) => {
    sqlRepositoy.getAllRepoCollection4TenantOrg(getTenant(req, res), req.query.org, req.query.bustTheCache).then(result => {
        return res.json(result);
    });
});
//collectionName
router.get('/GetRepoCollectionByName', validateToken, (req, res) => {
    sqlRepositoy.getAllRepoCollection4TenantOrg(req.query.collectionName, req.query.bustTheCache).then(result => {
        return res.json(result.recordset);
    });
});
router.get('/SetupWebHook', validateToken, (req, res) => {
    gitRepository.setupWebHook(getTenant(req, res), req.query.org).then((result) => {
        console.log('==>Setupwebhook returning ' + result);
        return res.json({ val: result });
    });
});
module.exports = router;
//# sourceMappingURL=service-routes.js.map