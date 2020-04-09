//https://www.youtube.com/watch?v=or1_A4sJ-oY
const router = require('express').Router();

/*
Jira calls must have following in the header

req.headers['jiraOrg'];  //AccessibleResources Id
req.headers['JiraToken'];  //This is JiraTenant Id
*/

import {SQLRepository} from './Lib/sqlRepository';
import {GitRepository} from './Lib/GitRepository';
import {JiraRepository} from './Lib/JiraRepository';

const sqlRepositoy = new SQLRepository(null);
const gitRepository = new GitRepository();
const jiraRepository = new JiraRepository();

const jwt = require('jsonwebtoken');
const verifyOptions = {
  algorithm: ['RS256'],
};

async function isTokenValid(tenantId: number): Promise<boolean> {
  try {
    //Return  false if there is no tenant, true if tenant exist
    return await sqlRepositoy.checkToken(tenantId).then(r => {
      if (r) {
        return true;
      } else {
        return false;
      }
    });
  } catch (ex) {
    return false;
  }
}

async function isJiraTokenValid(tenantId: string): Promise<boolean> {
  try {
    //Return  false if there is no tenant, true if tenant exist
    return await sqlRepositoy.checkJiraToken(tenantId).then(r => {
      if (r) {
        return true;
      } else {
        return false;
      }
    });
  } catch (ex) {
    return false;
  }
}

function validateToken(req: any, res: any, next: any) {
  const tenantId = getTenant(req); //GetTenantId from req
  isTokenValid(tenantId)
    .then(val => {
      if (!val) {
        return res.json({val: false, code: 404, message: 'Auth Failed'});
      } else {
        next();
      }
    })
    .catch(ex => {
      console.log(`validateToken ${ex}`);
    });
}

function validateJiraToken(req: any, res: any, next: any) {
  const tenantId = getJiraTenant(req); //GetTenantId from req
  // console.log(`==> validateJiraToken: ${tenantId}`);
  isJiraTokenValid(tenantId)
    .then(val => {
      if (!val) {
        return res.json({val: false, code: 404, message: 'Jira Auth Failed'});
      } else {
        next();
      }
    })
    .catch(ex => {
      console.log(`validateJiraToken ${ex}`);
    });
}

function getTenant(req: any) {
  try {
    const token = req.headers['authorization']; //it is tenantId in header
    //
    const result = jwt.verify(token, process.env.Session_Key, verifyOptions);
    if (result) return result;
    else {
      return;
    }
  } catch (ex) {
    console.log(`==> getTenant ${ex}`);
    return;
  }
}

//token has the tenantId - It always come in authorization header as a token
function getJiraTenant(req: any) {
  try {
    const token = req.headers['authorization'].trim(); //it is tenantId in header
    // console.log(` ==> GetJiraTenant raw token from the call ${token}`);
    const result = jwt.verify(token, process.env.Session_Key, verifyOptions);
    if (result) {
      // console.log(` ==> GetJiraTenant - unencrypted token ${result}`);
      return result;
    } else {
      return;
    }
  } catch (ex) {
    console.log(`==> getJiraTenant ${ex}`);
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
router.get('/GetJiraOrgs', validateJiraToken, (req: any, res: any) => {
  jiraRepository
    .getJiraOrgs(getJiraTenant(req), Boolean(req.query.bustTheCache === 'true'))
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
router.get('/GetJiraUsers', validateJiraToken, (req: any, res: any) => {
  jiraRepository
    .getJiraUsers(getJiraTenant(req), req.query.org, Boolean(req.query.bustTheCache === 'true'))
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
router.get('/GetJiraIssues', validateJiraToken, (req: any, res: any) => {
  jiraRepository
    .getJiraIssues(
      getJiraTenant(req), //tenant
      req.query.org, //org
      req.query.userid, //'557058:f39310b9-d30a-41a3-8011-6a6ae5eeed07', //userId
      '"In Progress" OR status="To Do"', //status
      'summary,status, assignee,created, updated', //fields
      Boolean(req.query.bustTheCache === 'true'),
    )
    .then(result => {
      return res.json(result);
    })
    .catch(err => {
      console.log(`GetJiraIssues: ${err}`);
      return res.json(err);
    });
});

router.get('/GetOrg', validateToken, async (req: any, res: any) => {
  // console.log(`calling getOrg bustTheCashe: ${req.query.bustTheCache} GetfromGit: ${req.query.getFromGit}`);
  await gitRepository
    .getOrg(getTenant(req), Boolean(req.query.bustTheCache === 'true'), Boolean(req.query.getFromGit === 'true'))
    .then(result => {
      try {
        if (!result) {
          console.log(`getOrg is null`);
          return res.json(null);
        }
        return res.json(result);
      } catch (ex) {
        console.log('GetOrg: ' + ex);
      }
    })
    .catch(ex => {
      console.log(`GetOrg Error: ${ex}`);
    });
});

router.get('/getGitLoggedInUSerDetails', validateToken, (req: any, res: any) => {
  sqlRepositoy
    .getGitLoggedInUSerDetails(getTenant(req), Boolean(req.query.bustTheCache === 'true'))
    .then(result => {
      return res.json(result);
    })
    .catch(err => {
      console.log(`getGitLoggedInUSerDetails: ${err}`);
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
router.get('/GetGraphData4XDays', validateToken, (req: any, res: any) => {
  sqlRepositoy
    .GetGraphData4XDays(req.query.org, req.query.day, req.query.login, Boolean(req.query.bustTheCache === 'true'))
    .then(result => {
      return res.json(result);
    })
    .catch(err => {
      console.log(`GetGraphData4XDays: ${err}`);
      return res.json(err);
    });
});

router.get('/GetHookStatus', validateToken, (req: any, res: any) => {
  const tenantId = getTenant(req);
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
        return res.json({val: true});
      } else {
        return res.json({val: false});
      }
      //return res.json(result.recordset);
    })
    .catch(ex => {
      if (ex) {
        console.log(`==> GetHookStatus ${ex}`);
      }
      return res.json({val: false});
    });
});

router.get('/GetRepositoryPR', validateToken, (req: any, res: any) => {
  sqlRepositoy
    .getRepoPR(req.query.org, req.query.repo, req.query.day, req.query.pageSize)
    .then(result => {
      return res.json(result);
    })
    .catch(err => {
      console.log(`GetRepositoryPR: ${err}`);
      return res.json(err);
    });
});

router.get('/TopDevForLastXDays', validateToken, (req: any, res: any) => {
  if (!req.query.day) {
    req.query.day = '1';
  }
  sqlRepositoy
    .getTopDev4LastXDays(req.query.org, req.query.day)
    .then(result => {
      return res.json(result);
    })
    .catch(err => {
      console.log(`getTopDev4LastXDays: ${err}`);
      return res.json(err);
    });
});

router.get('/GitDev4Org', validateToken, (req: any, res: any) => {
  sqlRepositoy
    .getGitDev4Org(req.query.org)
    .then(result => {
      return res.json(result);
    })
    .catch(err => {
      console.log(`GitDev4Org: ${err}`);
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
router.get('/PullRequestCountForLastXDays', validateToken, (req: any, res: any) => {
  if (!req.query.day) {
    req.query.day = '1';
  }
  sqlRepositoy
    .getPRCount4LastXDays(req.query.org, req.query.login, req.query.day)
    .then(result => {
      return res.json(result);
    })
    .catch(err => {
      console.log(`PullRequestCountForLastXDays: ${err}`);
      return res.json(err);
    });
});

router.get('/PullRequestForLastXDays', validateToken, (req: any, res: any) => {
  if (!req.query.day) {
    req.query.day = '1';
  }
  sqlRepositoy
    .getPR4LastXDays(getTenant(req), req.query.day)
    .then(result => {
      return res.json(result);
    })
    .catch(err => {
      console.log(`PullRequestForLastXDays: ${err}`);
      return res.json(err);
    });
});

router.get('/GetTopRespositories4XDays', validateToken, (req: any, res: any) => {
  if (!req.query.day) {
    req.query.day = '1';
  }
  sqlRepositoy
    .getTopRepo4XDays(req.query.org, req.query.day)
    .then(result => {
      return res.json(result);
    })
    .catch(err => {
      console.log(`GetTopRespositories4XDays: ${err}`);
      return res.json(err);
    });
});

router.get('/PullRequest4Dev', validateToken, (req: any, res: any) => {
  if (!req.query.day) {
    req.query.day = '1';
  }
  sqlRepositoy
    .getPR4Dev(req.query.org, req.query.day, req.query.login, req.query.action, req.query.pageSize)
    .then(result => {
      return res.json(result);
    })
    .catch(err => {
      console.log(`PullRequest4Dev: ${err}`);
      return res.json(err);
    });
});

router.post('/SaveMSR', validateToken, (req: any, res: any) => {
  if (!req.query.day) {
    req.query.day = '1';
  }
  sqlRepositoy
    .saveMSR(req.body.srId, req.body.userId, req.body.org, req.body.statusDetails, req.body.reviewer, req.body.status, req.body.links, req.body.manager, req.body.managerComment, req.body.managerStatus)
    .then(result => {
      return res.json(result);
    })
    .catch(err => {
      console.log(`SaveMSR: ${err}`);
      return res.json(err);
    });
});

router.get('/getSR4User', validateToken, (req: any, res: any) => {
  sqlRepositoy
    .getSR4User(req.query.userid, Boolean(req.query.bustTheCache === 'true'))
    .then(result => {
      return res.json(result);
    })
    .catch(err => {
      console.log(`getSR4User: ${err}`);
      return res.json(err);
    });
});

router.get('/GetSR4User4Review', validateToken, (req: any, res: any) => {
  sqlRepositoy
    .GetSR4User4Review(req.query.userid, req.query.status, req.query.userFilter, req.query.dateFilter, Boolean(req.query.bustTheCache === 'true'))
    .then(result => {
      return res.json(result);
    })
    .catch(err => {
      console.log(`GetSR4User4Review: ${err}`);
      return res.json(err);
    });
});

router.get('/GetSR4Id', validateToken, (req: any, res: any) => {
  sqlRepositoy
    .getSR4Id(req.query.id, Boolean(req.query.bustTheCache === 'true'))
    .then(result => {
      return res.json(result);
    })
    .catch(err => {
      console.log(`GetSR4Id: ${err}`);
      return res.json(err);
    });
});

//    /GetOrg?tenantId='rsarosh@hotmail.com'&Org='LabShare'&bustTheCache=false&getFromGit = true
router.get('/GetRepos', validateToken, (req: any, res: any) => {
  gitRepository
    .getRepos(getTenant(req), req.query.org, Boolean(req.query.bustTheCache === 'true'), Boolean(req.query.getFromGit === 'true'))
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

router.get('/GetPRfromGit', validateToken, (req: any, res: any) => {
  const tenantId = getTenant(req);
  gitRepository
    .getRepos(tenantId, req.query.org, false, false)
    .then(result => {
      for (const r of result) {
        gitRepository.fillPullRequest(tenantId, req.query.org, r.RepoName).catch(ex => {
          console.log(`GetPRfromGit ${ex}`);
        });
      }
      return res.json(result.length);
    })
    .catch(err => {
      console.log(`GetPRfromGit: ${err}`);
      return res.json(err);
    });
});

router.get('/GetAllRepoCollection4TenantOrg', validateToken, (req: any, res: any) => {
  sqlRepositoy
    .getAllRepoCollection4TenantOrg(getTenant(req), req.query.org, Boolean(req.query.bustTheCache === 'true'))
    .then(result => {
      return res.json(result);
    })
    .catch(err => {
      console.log(`GetAllRepoCollection4TenantOrg: ${err}`);
      return res.json(err);
    });
});

//collectionName
router.get('/GetRepoCollectionByName', validateToken, (req: any, res: any) => {
  sqlRepositoy
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
router.get('/GetRepoParticipation4Login', validateToken, (req: any, res: any) => {
  sqlRepositoy
    .GetRepoParticipation4Login(req.query.org, req.query.login, req.query.days, Boolean(req.query.bustTheCache === 'true'))
    .then(result => {
      return res.json(result);
    })
    .catch(err => {
      console.log(`GetRepoParticipation4Login: ${err}`);
      return res.json(err);
    });
});


router.get('/SetupWebHook', validateToken, (req: any, res: any) => {
  gitRepository
    .setupWebHook(getTenant(req), req.query.org)
    .then((result: any) => {
      console.log('==>Setupwebhook returning ' + result);
      return res.json({val: result});
    })
    .catch(err => {
      console.log(`SetupWebHook: ${err}`);
      return res.json(err);
    });
});


router.post('/saveOrgChart', validateToken, (req: any, res: any) => {
  if (!req.query.day) {
    req.query.day = '1';
  }
  let tenantId = getTenant(req); //GetTenantId from req
  sqlRepositoy.getGitLoggedInUSerDetails(tenantId, false).then(result => {
    sqlRepositoy.isUserAdmin(result.UserName, req.body.org, false).then(r => {
      //check r here, if tenant is an admin let the call go thru, else reject
      if (r === 1) {
        sqlRepositoy
          .saveOrgChart(req.body.userId, req.body.org, req.body.orgChart)
          .then(result => {
            return res.json(result);
          })
          .catch(err => {
            console.log(`saveOrgChart: ${err}`);
            return res.json(err);
          });
      } else {
        return res.json({val: tenantId, code: 401, message: 'Unauthorize: Caller not Admin'});
      }
    });
  });
});

router.get('/getOrgChart', validateToken, (req: any, res: any) => {
  if (!req.query.day) {
    req.query.day = '1';
  }
  sqlRepositoy
    .getOrgChart(req.query.org, Boolean(req.query.bustTheCache === 'true'))
    .then(result => {
      return res.json(result);
    })
    .catch(err => {
      console.log(`GetOrgChart: ${err}`);
      return res.json(err);
    });
});

router.get('/getUserRole', validateToken, (req: any, res: any) => {
  sqlRepositoy
    .getUserRole(req.query.userid, req.query.org, Boolean(req.query.bustTheCache === 'true'))
    .then(result => {
      return res.json(result);
    })
    .catch(err => {
      console.log(`getUserRole: ${err}`);
      return res.json(err);
    });
});

router.get('/getRole4Org', validateToken, (req: any, res: any) => {
  sqlRepositoy
    .getRole4Org(req.query.org, true)
    .then(result => {
      return res.json(result);
    })
    .catch(err => {
      console.log(`getRole4Org: ${err}`);
      return res.json(err);
    });
});

router.post('/saveUserRole', validateToken, (req: any, res: any) => {
  //check the caller and reject the call if he is not already an admin
  //only Admin can add userroles

  let tenantId = getTenant(req); //GetTenantId from req
  sqlRepositoy.getGitLoggedInUSerDetails(tenantId, false).then(result => {
    sqlRepositoy.isUserAdmin(result.UserName, req.body.org, false).then(r => {
      //check r here, if tenant is an admin let the call go thru, else reject
      if (r === 1) {
        sqlRepositoy
          .saveUserRole(req.body.userId, req.body.org, req.body.role)
          .then(result => {
            return res.json(result);
          })
          .catch(err => {
            console.log(`saveUserRole: ${err}`);
            return res.json(err);
          });
      } else {
        return res.json({val: tenantId, code: 401, message: 'Unauthorize: Caller not admin'});
      }
    });
  });
});

router.post('/deleteUserRole', validateToken, (req: any, res: any) => {
  //check the caller and reject the call if he is not already an admin
  //only Admin can add userroles

  let tenantId = getTenant(req); //GetTenantId from req
  sqlRepositoy.getGitLoggedInUSerDetails(tenantId, false).then(result => {
    sqlRepositoy.isUserAdmin(result.UserName, req.body.org, false).then(r => {
      //check r here, if tenant is an admin let the call go thru, else reject
      if (r === 1) {
        sqlRepositoy
          .deleteUserRole(req.body.userId, req.body.org, req.body.role)
          .then(result => {
            return res.json(result);
          })
          .catch(err => {
            console.log(`deleteUserRole: ${err}`);
            return res.json(err);
          });
      } else {
        return res.json({val: tenantId, code: 401, message: 'Unauthorize: Caller not admin'});
      }
    });
  });
});

router.get('/isUserAdmin', validateToken, (req: any, res: any) => {
  sqlRepositoy
    .isUserAdmin(req.query.userid, req.query.org, Boolean(req.query.bustTheCache === 'true'))
    .then(result => {
      return res.json(result);
    })
    .catch(err => {
      console.log(`isUserAdmin: ${err}`);
      return res.json(err);
    });
});

router.get('/isUserMSRAdmin', validateToken, (req: any, res: any) => {
  sqlRepositoy
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
