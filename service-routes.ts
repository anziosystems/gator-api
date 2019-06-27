//https://www.youtube.com/watch?v=or1_A4sJ-oY
const router = require('express').Router();

import {SQLRepository} from './Lib/sqlRepository';
import {GitRepository} from './Lib/gitRepository';

let sqlRepositoy = new SQLRepository(null);
let gitRepository = new GitRepository();
const jwt = require('jsonwebtoken');
const verifyOptions = {
  algorithm: ['RS256'],
};

async function isTokenValid(tenantId: number): Promise<boolean> {
  try {
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

function validateToken(req: any, res: any, next: any) {
  const tenantId = getTenant(req, res);
  isTokenValid(tenantId).then(val => {
    if (!val) {
      return res.json({val: false, code: 404, message: 'Auth Failed'});
    } else {
      next();
    }
  });
}

function getTenant(req: any, res: any) {
  try {
    const token = req.headers['authorization']; //it is tenantId in header
    const result = jwt.verify(token, process.env.Session_Key, verifyOptions);
    if (result) return result;
    else {
      return;
    }
  } catch (ex) {
    console.log(`==> ${ex}`);
    return;
  }
}

router.get('/GetOrg', validateToken, (req: any, res: any) => {
  gitRepository.getOrg(getTenant(req, res), req.query.bustTheCache, req.query.getFromGit).then(result => {
    return res.json(result);
  });
});

router.get('/GetHookStatus', validateToken, (req: any, res: any) => {

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
  sqlRepositoy.getRepoPR(req.query.org, req.query.repo, req.query.day, req.query.pageSize).then(result => {
    return res.json(result);
  });
});

router.get('/TopDevForLastXDays', validateToken, (req: any, res: any) => {
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
router.get('/PullRequestCountForLastXDays', validateToken, (req: any, res: any) => {
  if (!req.query.day) {
    req.query.day = '1';
  }
  sqlRepositoy.getPRCount4LastXDays(req.query.org, req.query.day).then(result => {
    return res.json(result);
  });
});

router.get('/PullRequestForLastXDays', validateToken, (req: any, res: any) => {
  if (!req.query.day) {
    req.query.day = '1';
  }
  sqlRepositoy.getPR4LastXDays(getTenant(req, res), req.query.day).then(result => {
    return res.json(result);
  });
});

router.get('/GetTopRespositories4XDays', validateToken, (req: any, res: any) => {
  if (!req.query.day) {
    req.query.day = '1';
  }
  sqlRepositoy.getTopRepo4XDays(req.query.org, req.query.day).then(result => {
    return res.json(result);
  });
});

router.get('/PullRequest4Dev', validateToken, (req: any, res: any) => {
  if (!req.query.day) {
    req.query.day = '1';
  }
  sqlRepositoy.getPR4Dev(req.query.org, req.query.day, req.query.login, req.query.action, req.query.pageSize).then(result => {
    return res.json(result);
  });
});

//    /GetOrg?tenantId='rsarosh@hotmail.com'&Org='LabShare'&bustTheCache=false&getFromGit = true
router.get('/GetRepos', validateToken, (req: any, res: any) => {
  gitRepository.getRepos(getTenant(req, res), req.query.org, req.query.bustTheCache, req.query.getFromGit).then(result => {
    if (result) {
      return res.json(result);
    }
  });
});

router.get('/GetPRfromGit', validateToken, (req: any, res: any) => {
  const tenantId = getTenant(req, res);
  gitRepository.getRepos(tenantId, req.query.org, false, false).then(result => {
    for (let i = 0; i < result.length; i++) {
      const res = gitRepository.fillPullRequest(tenantId, req.query.org, result[i].RepoName);
    }
    return res.json(result.length);
  });
});


router.get('/GetAllRepoCollection4TenantOrg', validateToken, (req: any, res: any) => {
  sqlRepositoy.getAllRepoCollection4TenantOrg(getTenant(req, res), req.query.org, req.query.bustTheCache).then(result => {
    return res.json(result);
  });
});

//collectionName
router.get('/GetRepoCollectionByName', validateToken, (req: any, res: any) => {
  sqlRepositoy.getAllRepoCollection4TenantOrg(req.query.collectionName, req.query.bustTheCache).then(result => {
    return res.json(result.recordset);
  });
});

router.get('/SetupWebHook', validateToken, (req: any, res: any) => {
  gitRepository.setupWebHook(getTenant(req, res), req.query.org).then((result:any)  => {
    return result;
  });
});

module.exports = router;
