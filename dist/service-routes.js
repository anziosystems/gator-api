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
const axios = require('axios').default;
/*
Jira calls must have following in the header

req.headers['jiraOrg'];  //AccessibleResources Id
req.headers['JiraToken'];  //This is JiraTenant Id
*/
const sqlRepository_1 = require("./Lib/sqlRepository");
const GitRepository_1 = require("./Lib/GitRepository");
const JiraRepository_1 = require("./Lib/JiraRepository");
const sqlRepository = new sqlRepository_1.SQLRepository(null);
const gitRepository = new GitRepository_1.GitRepository();
const jiraRepository = new JiraRepository_1.JiraRepository();
const jwt = require('jsonwebtoken');
const verifyOptions = {
    algorithm: ['RS256'],
};
function isUserValid(email) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //Return  false if there is no user, true if user exist
            return yield sqlRepository.checkUser(email).then(r => {
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
            //Return  false if there is no user, true if user exist
            return yield sqlRepository.checkJiraToken(tenantId).then(r => {
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
function validateUser(req, res, next) {
    const userId = getUserId(req);
    isUserValid(userId)
        .then(val => {
        if (!val) {
            return res.json({ val: false, code: 404, message: 'Auth Failed' });
        }
        else {
            next();
        }
    })
        .catch(ex => {
        console.log(`[E] validateUser ${ex}`);
    });
}
function validateJiraUser(req, res, next) {
    const userId = getJiraUser(req);
    if (!userId) {
        console.log(`[E] validateJiraUser - No userId found in token`);
        return;
    }
    isJiraTokenValid(userId)
        .then(val => {
        if (!val) {
            return res.json({ val: false, code: 404, message: 'Jira Auth Failed' });
        }
        else {
            next();
        }
    })
        .catch(ex => {
        console.log(`[E] validateJiraToken ${ex}`);
    });
}
//Get User from header
function getUserId(req) {
    try {
        const token = req.headers['authorization']; //it is UserId in header
        if (!token) {
            console.log(`[E] getUserId - No token found in authorization header`);
            return;
        }
        /*
        family_name:"Sarosh"
        given_name:"Rafat"
        name:"Rafat Sarosh"
        role:"user"
        roles:Array(0) []
        length:0
        username:"rafat.sarosh@axleinfo.com"
        displayName:"Rafat Sarosh"
        iat:1587305018
        id:"8584"
        */
        const result = jwt.verify(token, process.env.Session_Key, verifyOptions);
        if (typeof result === 'string') {
            return result;
        }
        else {
            return result.username; //Org header has the full user object
        }
    }
    catch (ex) {
        console.log(`[E] getUserId ${ex.message}`);
        return;
    }
}
//token has the tenantId - It always come in authorization header as a token
function getJiraUser(req) {
    try {
        if (!req.headers['authorization']) {
            console.log(`[E] gitJiraUser No Authorization header`);
            return;
        }
        const token = req.headers['authorization'].trim(); //it is tenantId in header
        // console.log(` ==> GetJiraTenant raw token from the call ${token}`);
        if (!token) {
            console.log(`[E] gitJiraUser No Token found in Authorization header`);
            return;
        }
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
        console.log(`[E] getJiraUser ${ex}`);
        return;
    }
}
// async function getJiraOrg(req: any, res: any): Promise<any> {
//   const jiraOrg = req.headers['jiraOrg']; //it is tenantId in header
//   if (!jiraOrg) {
//     //Oops!lets  get it from the DB
//     jiraRepository.getJiraOrg(getJiraTenant(req, res), req.query.bustTheCache).then(result => {
//       console.log(`getJiraOrg : result`);
//       return res.json(result); //guid string of the AccessResource Id
//     });
//   } else {
//     return jiraOrg;
//   }
// }
//header must have JiraTenant
router.get('/GetJiraOrgs', validateJiraUser, (req, res) => {
    jiraRepository
        .getJiraOrgs(getJiraUser(req), Boolean(req.query.bustTheCache === 'true'))
        .then(result => {
        /*
        result
        Array(3) [Object, Object, Object]
        result[0]
        Object {id: "0e493c98-6102-463a-bc17-4980be22651b", url: "https://labshare.atlassian.net", name: "labshare", scopes: Array(4), avatarUrl: "https://site-admin-avatar-cdn.prod.public.atl-paas…"}
      */
        return res.json(result); //guid string of the AccessResource Id
    })
        .catch(err => {
        console.log(`GetJiraOrg: ${err}`);
        return res.json(err);
    });
});
//
router.get('/GetJiraUsers', validateJiraUser, (req, res) => {
    jiraRepository
        .getJiraUsers(getJiraUser(req), req.query.org, Boolean(req.query.bustTheCache === 'true'))
        .then(result => {
        /*
      JSON.parse(result)
      Array(29) [Object, Object, Object, Object, Object, Object, Object, Object, …]
      JSON.parse(result)[0]
      Object {self: "https://api.atlassian.com/ex/jira/786d2410-0054-41…", accountId: "5d53f3cbc6b9320d9ea5bdc2", accountType: "app", avatarUrls: Object, displayName: "Jira Outlook", …}
       */
        //let r = JSON.parse (result); -No need to parse the result
        return res.json(result); //guid string of the AccessResource Id
    })
        .catch(err => {
        console.log(`getJiraTenant: ${err}`);
        return res.json(err);
    });
});
//header must have JiraTenant
router.get('/GetJiraIssues', validateJiraUser, (req, res) => {
    jiraRepository
        .getJiraIssues(getJiraUser(req), //user
    req.query.org, //org
    req.query.userid, //'557058:f39310b9-d30a-41a3-8011-6a6ae5eeed07', //userId
    '"In Progress" OR status="To Do"', //status
    'summary,status, assignee,created, updated', //fields
    Boolean(req.query.bustTheCache === 'true'))
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`GetJiraIssues: ${err}`);
        return res.json(err);
    });
});
router.get('/GetJiraData', validateUser, (req, res) => {
    sqlRepository
        .GetJiraData(req.query.org, //org
    req.query.userid, //'557058:f39310b9-d30a-41a3-8011-6a6ae5eeed07', //userId
    req.query.day, Boolean(req.query.bustTheCache === 'true'))
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`GetJiraIssues: ${err}`);
        return res.json(err);
    });
});
//org coming in here is Orgnization org, it is for OrgLink table
router.get('/GetGitOrg', validateUser, (req, res) => __awaiter(this, void 0, void 0, function* () {
    const user = getUserId(req);
    const org = req.query.org;
    yield gitRepository
        .getOrgFromGit(user, org, true)
        .then(result => {
        try {
            if (!result) {
                console.log(`GetGitOrg is null`);
                return res.json(null);
            }
            return res.json(result);
        }
        catch (ex) {
            console.log('GetGitOrg: ' + ex);
        }
    })
        .catch(ex => {
        console.log(`GetGitOrg Error: ${ex}`);
    });
}));
router.get('/GetOrg', validateUser, (req, res) => __awaiter(this, void 0, void 0, function* () {
    //TODO: just get from SQL after LSAuth implementatiopn
    const user = getUserId(req);
    yield sqlRepository.getOrg4UserId(user, Boolean(req.query.bustTheCache === 'true')).then(result => {
        if (result) {
            return res.json(result);
        }
    });
}));
router.get('/getLoggedInUSerDetails', validateUser, (req, res) => {
    sqlRepository
        .getLoggedInUSerDetails(getUserId(req), Boolean(req.query.bustTheCache === 'true'))
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`getLoggedInUSerDetails: ${err}`);
        return res.json(err);
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
router.get('/GetGraphData4XDays', validateUser, (req, res) => {
    sqlRepository
        .GetGraphData4XDays(req.query.org, req.query.day, req.query.login, Boolean(req.query.bustTheCache === 'true'))
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`GetGraphData4XDays: ${err}`);
        return res.json(err);
    });
});
router.get('/GetHookStatus', validateUser, (req, res) => {
    const tenantId = getUserId(req);
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
router.get('/GetRepositoryPR', validateUser, (req, res) => {
    sqlRepository
        .getRepoPR(req.query.org, req.query.repo, req.query.day, req.query.pageSize)
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`GetRepositoryPR: ${err}`);
        return res.json(err);
    });
});
router.get('/TopDevForLastXDays', validateUser, (req, res) => {
    if (!req.query.day) {
        req.query.day = '1';
    }
    sqlRepository
        .getTopDev4LastXDays(req.query.org, req.query.day, req.query.context)
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`getTopDev4LastXDays: ${err}`);
        return res.json(err);
    });
});
router.get('/GetAllUsers', validateUser, (req, res) => {
    sqlRepository
        .getAllUsers(req.query.org)
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`GetAllUsers: ${err}`);
        return res.json(err);
    });
});
// //No one calls it
// router.get('/GetDev4Org', validateUser, (req: any, res: any) => {
//   sqlRepository
//     .GetUser4Org(req.query.org)
//     .then(result => {
//       return res.json(result);
//     })
//     .catch(err => {
//       console.log(`GitDev4Org: ${err}`);
//       return res.json(err);
//     });
// });
router.get('/GetUser4Org', validateUser, (req, res) => {
    sqlRepository
        .GetUser4Org(req.query.org)
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`GetUser4Org: ${err}`);
        return res.json(err);
    });
});
router.get('/GetWatcher', validateUser, (req, res) => {
    sqlRepository
        .getWatcher(req.query.org, req.query.gitorg)
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`GetWatcher: ${err}`);
        return res.json(err);
    });
});
router.get('/GetKudos', validateUser, (req, res) => {
    sqlRepository
        .getKudos(req.query.org, req.query.gitorg)
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`GetKudos: ${err}`);
        return res.json(err);
    });
});
router.get('/GetKudos4User', validateUser, (req, res) => {
    sqlRepository
        .getKudos4User(req.query.target)
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`GetKudos4User: ${err}`);
        return res.json(err);
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
router.get('/PullRequestCountForLastXDays', validateUser, (req, res) => {
    if (!req.query.day) {
        req.query.day = '1';
    }
    sqlRepository
        .getPRCount4LastXDays(req.query.org, req.query.login, req.query.day)
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`PullRequestCountForLastXDays: ${err}`);
        return res.json(err);
    });
});
router.get('/PullRequestForLastXDays', validateUser, (req, res) => {
    if (!req.query.day) {
        req.query.day = '1';
    }
    sqlRepository
        .getPR4LastXDays(getUserId(req), req.query.day)
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`PullRequestForLastXDays: ${err}`);
        return res.json(err);
    });
});
router.get('/Signup', (req, res) => {
    console.log('signup called');
    if (req.query.token) {
        //This is the hack, because of some weiredness when the string comes from browser with %2B it become space.
        //Same string coming from postman remain as +
        //unfortunate hack
        let _ampToken = req.query.token.replace(' ', '+');
        // console.log(`[I] Token Received as: ${req.query.token}`);
        // console.log(`[I] Token after decoding: ${decodeURIComponent(req.query.token)}`);
        sqlRepository.saveSignUpToken(decodeURIComponent(_ampToken)).then((subId) => {
            //https://docs.microsoft.com/en-us/azure/marketplace/partner-center-portal/pc-saas-fulfillment-api-v2
            //STEP - 1
            //Get the Token from AD to call MarketPlace "https://login.microsoftonline.com/ea097b21-0d4b-4ce9-9318-04a9061bfe96/oauth2/token";
            let _subId = subId;
            //converts %2B to + thats what next call want
            //NOTE: In SQL it saves %2B as SPACES. So a string from SQL need to do a  str.replace(' ', '+')
            console.log(`[S] _ampToken: ${_ampToken}`);
            let _accessToken;
            let _config = {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            };
            let _url = `https://login.microsoftonline.com/ea097b21-0d4b-4ce9-9318-04a9061bfe96/oauth2/token`;
            let _data = {
                grant_type: 'client_credentials',
                client_id: 'd5245214-485d-4616-b2ac-4297b845bac9',
                client_secret: 'oDBg-a3s.NCF7~eOS5EYfwZ7fN9.q-NXK5',
                resource: '62d94f6c-d599-489b-a797-3e10e42fbe22',
            };
            let _request = Object.keys(_data)
                .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(_data[k])}`)
                .join('&');
            axios
                .post(_url, _request, _config)
                .then((resp) => {
                /*
              resp = {
                "token_type": "Bearer",
                "expires_in": "3599",
                "ext_expires_in": "3599",
                "expires_on": "1591494943",
                "not_before": "1591491043",
                "resource": "62d94f6c-d599-489b-a797-3e10e42fbe22",
                "access_token": "XX"
                }*/
                _accessToken = resp.data.access_token;
                //Get the subscription details - call resolve subscription you get the quantity for the offer, subscription Id etc
                //STEP - 2
                /*
                {
                "id": "<guid>",
                "subscriptionName": "Contoso Cloud Solution",
                "offerId": "offer1",
                "planId": "silver",
                "quantity": "20"
                }
                */
                _url = `https://marketplaceapi.microsoft.com/api/saas/subscriptions/resolve?api-version=2018-08-31`;
                _config = {};
                _config = {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
                        'x-ms-marketplace-token': _ampToken,
                        Authorization: `Bearer  ${_accessToken}`,
                    },
                };
                axios
                    .post(_url, null, _config)
                    .then((subDetails) => {
                    //Save subscription Details
                    sqlRepository.UpdateSubscriptionDetails(_subId, subDetails).then(x => {
                        //STEP - 3
                        //Activate a subscription
                        _url = `https://marketplaceapi.microsoft.com/api/saas/subscriptions/resolve?api-version=2018-08-31&`;
                        _config = {
                            headers: { 'x-ms-marketplace-token': _ampToken, Authorization: `Bearer  ${_accessToken}` },
                        };
                        _data = {
                            planId: subDetails.data.planId,
                            quantity: subDetails.data.quantity,
                        };
                        axios
                            .post(_url, _data, _config)
                            .then((subActivated) => {
                            //update DB with the subactivate
                            if (subActivated.status === 200) {
                                sqlRepository.ActivateSubscriptionDetails(subId, true).then(y => {
                                    console.log('subscription Activated');
                                });
                            }
                        })
                            .catch((err) => {
                            console.log(err);
                        });
                    }); //subscription saved
                })
                    .catch((err) => {
                    console.log(err);
                }); //resolve Subscription
            })
                .catch((err) => {
                console.log(err);
            }); //Getting Token
        });
    }
    return res.json(`{ 'result:1'}`);
});
router.get('/GetTopRespositories4XDays', validateUser, (req, res) => {
    if (!req.query.day) {
        req.query.day = '1';
    }
    sqlRepository
        .getTopRepo4XDays(req.query.org, req.query.day)
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`GetTopRespositories4XDays: ${err}`);
        return res.json(err);
    });
});
router.get('/PullRequest4Dev', validateUser, (req, res) => {
    if (!req.query.day) {
        req.query.day = '1';
    }
    sqlRepository
        .getPR4Dev(req.query.org, req.query.day, req.query.login, req.query.action, req.query.pageSize)
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`PullRequest4Dev: ${err}`);
        return res.json(err);
    });
});
router.post('/SaveMSR', validateUser, (req, res) => {
    if (!req.query.day) {
        req.query.day = '1';
    }
    sqlRepository
        .saveMSR(req.body.srId, req.body.userId, req.body.org, req.body.statusDetails, req.body.reviewer, req.body.status, req.body.links, req.body.manager, req.body.managerComment, req.body.managerStatus, req.body.reportYear, req.body.reportMonth, req.body.reportNumber)
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`SaveMSR: ${err}`);
        return res.json(err);
    });
});
//updateUser
router.post('/updateUserConnectIds', validateUser, (req, res) => {
    sqlRepository
        .updateUserConnectIds(req.body.user, req.body.org)
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`SaveMSR: ${err}`);
        return res.json(err);
    });
});
router.post('/SetWatcher', validateUser, (req, res) => {
    sqlRepository
        .setWatcher(req.body.watcher, req.body.target, req.body.org, req.body.gitorg)
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`SetWatcher: ${err}`);
        return res.json(err);
    });
});
router.post('/SetKudos', validateUser, (req, res) => {
    sqlRepository
        .setKudos(req.body.sender, req.body.target, req.body.org, req.body.gitorg, req.body.kudos)
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`SetKudos: ${err}`);
        return res.json(err);
    });
});
//Called from Review (ic-reports) of UI to see the report of the user - Gets all reports for the user clicked, 
//the user who is asking for report is in AuthHeader  
//the user whoes reports are asked in query
router.get('/getSR4User', validateUser, (req, res) => {
    const userId = getUserId(req);
    sqlRepository.getUser(userId).then(user => {
        sqlRepository
            .getSR4User(req.query.userid, Boolean(req.query.bustTheCache === 'true'))
            .then(result => {
            sqlRepository.isUserMSRAdmin(user[0].Email, result[0].org, false).then(YorN => {
                if (YorN) {
                    return res.json(result);
                }
                else {
                    sqlRepository.IsXYAllowed(result[0].org, user[0].Email, user[0].Email, req.query.userid).then(isAllowed => {
                        if (isAllowed === true) {
                            return res.json(result);
                        }
                        else {
                            return res.json(`${user[0].DisplayName} has no permission to see ${req.query.userid} status report. `);
                        }
                    });
                }
            });
        })
            .catch(err => {
            console.log(`getSR4User: ${err}`);
            return res.json(err);
        });
    });
});
//Manager wants to see all reports he need to review 
router.get('/GetSR4User4Review', validateUser, (req, res) => {
    sqlRepository
        .GetSR4User4Review(req.query.userid, req.query.org, req.query.status, req.query.userFilter, req.query.dateFilter, Boolean(req.query.bustTheCache === 'true'))
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`GetSR4User4Review: ${err}`);
        return res.json(err);
    });
});
router.get('/GetSR4Id', validateUser, (req, res) => {
    sqlRepository
        .getSR4Id(req.query.id, Boolean(req.query.bustTheCache === 'true'))
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`GetSR4Id: ${err}`);
        return res.json(err);
    });
});
//Get list of Repos
//Get Repos from Git and Saves in SQL - calls from Hydration
router.get('/GetRepos', validateUser, (req, res) => {
    gitRepository
        .getRepos(getUserId(req), req.query.org, true, true) //Bust the cache and get the repo list from Git
        .then(result => {
        if (result) {
            return res.json(result);
        }
    })
        .catch(err => {
        console.log(`GetRepos: ${err}`);
        return res.json(err);
    });
});
//Gets the PR for every repo in the org
router.get('/GetPRFromGit', validateUser, (req, res) => {
    const tenantId = getUserId(req);
    gitRepository
        .getRepos(tenantId, req.query.org, false, false)
        .then(result => {
        result.forEach((r) => {
            gitRepository
                .fillPullRequest(tenantId, req.query.org, r.RepoName, true, true)
                .then(x => {
                if (x) {
                    //  console.log(`.`);
                }
            })
                .catch(ex => {
                console.log(`[E] GetPRfromGit: ${ex}`);
            });
        });
        // return res.json(result.length);
    })
        .catch(err => {
        console.log(`[E -2] GetPRfromGit: ${err}`);
        return res.json(err);
    });
});
router.get('/GetAllRepoCollection4TenantOrg', validateUser, (req, res) => {
    sqlRepository
        .getAllRepoCollection4TenantOrg(getUserId(req), req.query.org, Boolean(req.query.bustTheCache === 'true'))
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`GetAllRepoCollection4TenantOrg: ${err}`);
        return res.json(err);
    });
});
//collectionName
router.get('/GetRepoCollectionByName', validateUser, (req, res) => {
    sqlRepository
        .getAllRepoCollection4TenantOrg(req.query.collectionName, '', Boolean(req.query.bustTheCache === 'true'))
        .then(result => {
        return res.json(result.recordset);
    })
        .catch(err => {
        console.log(`GetRepoCollectionByName: ${err}`);
        return res.json(err);
    });
});
//GetRepoParticipation4Login
router.get('/GetRepoParticipation4Login', validateUser, (req, res) => {
    sqlRepository
        .GetRepoParticipation4Login(req.query.org, req.query.login, req.query.days, Boolean(req.query.bustTheCache === 'true'))
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`GetRepoParticipation4Login: ${err}`);
        return res.json(err);
    });
});
router.get('/SetupWebHook', validateUser, (req, res) => {
    gitRepository
        .setupWebHook(getUserId(req), req.query.org)
        .then((result) => {
        console.log('==>Setupwebhook returning ' + result);
        return res.json({ val: result });
    })
        .catch(err => {
        console.log(`SetupWebHook: ${err}`);
        return res.json(err);
    });
});
router.post('/saveOrgChart', validateUser, (req, res) => {
    if (!req.query.day) {
        req.query.day = '1';
    }
    let tenantId = getUserId(req);
    sqlRepository.getLoggedInUSerDetails(tenantId, false).then(result => {
        sqlRepository.isUserAdmin(result.UserName, req.body.org, false).then(r => {
            //check r here, if user is an admin let the call go thru, else reject
            if (r === 1) {
                sqlRepository
                    .saveOrgChart(req.body.userId, req.body.org, req.body.orgChart)
                    .then(result => {
                    return res.json(result);
                })
                    .catch(err => {
                    console.log(`saveOrgChart: ${err}`);
                    return res.json(err);
                });
            }
            else {
                return res.json({ val: tenantId, code: 401, message: 'Unauthorize: Caller not Admin' });
            }
        });
    });
});
router.post('/jiraHook', (req, res) => {
    sqlRepository
        .saveRawHookData(JSON.stringify(req.body))
        .then(result => {
        return res.json(result);
    })
        .catch((ex) => {
        console.log(ex);
    });
});
router.post('/Hook', (req, res) => {
    sqlRepository
        .saveRawHookData(JSON.stringify(req.body))
        .then(result => {
        return res.json(result);
    })
        .catch((ex) => {
        console.log(ex);
    });
});
router.post('/TFSHook', (req, res) => {
    sqlRepository
        .saveRawHookData(JSON.stringify(req.body))
        .then(result => {
        return res.json(result);
    })
        .catch((ex) => {
        console.log(ex);
    });
});
router.get('/getOrgChart', validateUser, (req, res) => {
    if (!req.query.day) {
        req.query.day = '1';
    }
    sqlRepository
        .getOrgChart(req.query.org, Boolean(req.query.bustTheCache === 'true'))
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`GetOrgChart: ${err}`);
        return res.json(err);
    });
});
router.get('/getOrgTree', validateUser, (req, res) => {
    if (!req.query.day) {
        req.query.day = '1';
    }
    sqlRepository
        .getOrgTree(req.query.org, req.query.userId, Boolean(req.query.bustTheCache === 'true'))
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`getOrgTree: ${err}`);
        return res.json(err);
    });
});
router.get('/getUserRole', validateUser, (req, res) => {
    sqlRepository
        .getUserRole(req.query.userid, req.query.org, Boolean(req.query.bustTheCache === 'true'))
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`getUserRole: ${err}`);
        return res.json(err);
    });
});
router.get('/getRole4Org', validateUser, (req, res) => {
    sqlRepository
        .getRole4Org(req.query.org, true)
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`getRole4Org: ${err}`);
        return res.json(err);
    });
});
router.post('/saveUserRole', validateUser, (req, res) => {
    //check the caller and reject the call if he is not already an admin
    //only Admin can add userroles
    let tenantId = getUserId(req);
    sqlRepository.getLoggedInUSerDetails(tenantId, false).then(result => {
        sqlRepository.isUserAdmin(result.UserName, req.body.org, false).then(r => {
            //check r here, if tenant is an admin let the call go thru, else reject
            if (r === 1) {
                sqlRepository
                    .saveUserRole(req.body.userId, req.body.org, req.body.role)
                    .then(result => {
                    return res.json(result);
                })
                    .catch(err => {
                    console.log(`saveUserRole: ${err}`);
                    return res.json(err);
                });
            }
            else {
                return res.json({ val: tenantId, code: 401, message: 'Unauthorize: Caller not admin' });
            }
        });
    });
});
router.post('/deleteUserRole', validateUser, (req, res) => {
    //check the caller and reject the call if he is not already an admin
    //only Admin can add userroles
    let tenantId = getUserId(req);
    sqlRepository.getLoggedInUSerDetails(tenantId, false).then(result => {
        sqlRepository.isUserAdmin(result.UserName, req.body.org, false).then(r => {
            //check r here, if tenant is an admin let the call go thru, else reject
            if (r === 1) {
                sqlRepository
                    .deleteUserRole(req.body.userId, req.body.org, req.body.role)
                    .then(result => {
                    return res.json(result);
                })
                    .catch(err => {
                    console.log(`deleteUserRole: ${err}`);
                    return res.json(err);
                });
            }
            else {
                return res.json({ val: tenantId, code: 401, message: 'Unauthorize: Caller not admin' });
            }
        });
    });
});
router.get('/isUserAdmin', validateUser, (req, res) => {
    sqlRepository
        .isUserAdmin(req.query.userid, req.query.org, Boolean(req.query.bustTheCache === 'true'))
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`isUserAdmin: ${err}`);
        return res.json(err);
    });
});
router.get('/isUserMSRAdmin', validateUser, (req, res) => {
    sqlRepository
        .isUserMSRAdmin(req.query.userid, req.query.org, Boolean(req.query.bustTheCache === 'true'))
        .then(result => {
        return res.json(result);
    })
        .catch(err => {
        console.log(`isUserMSRAdmin: ${err}`);
        return res.json(err);
    });
});
module.exports = router;
//# sourceMappingURL=service-routes.js.map