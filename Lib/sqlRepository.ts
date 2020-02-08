const sql = require('mssql');
import * as _ from 'lodash';
import {isNullOrUndefined} from 'util';
// import {EMLINK} from 'constants';
//import {RedisStorage, LabShareCache} from "@labshare/services-cache";
const NodeCache = require('node-cache');
const dotenv = require('dotenv');
dotenv.config();
const CryptoJS = require('crypto-js');

class PullRequest {
  Org: string;
  Title: string;
  organization: string;
  Login: string;
  Action: string;
  PullRequestId: number;
  PullRequestUrl: string;
  State: string;
  Avatar_Url: string;
  User_Url: string;
  Created_At: string;
  Body: string;
  Teams_Url: string;
  Repo_Name: string;
  Repo_FullName: string;
  Repo_Description: string;
  Links: string;
  PullId: string;
}

class Tenant {
  Id: number;
  Email: string;
  UserName: string;
  DisplayName: string;
  ProfileUrl: String;
  AuthToken: string;
  RefreshToken: string;
  Photo: string;
}

class JiraTenant {
  Id: string;
  Email: string;
  UserName: string;
  DisplayName: string;
  ProfileUrl: String;
  AuthToken: string;
  RefreshToken: string;
  Photo: string;
  AccessibleResources: any;
}

/*
  TenantId is GitId for the logged in user
*/
class SQLRepository {
  pr: PullRequest;
  raw: string;
  pool: any;
  myCache: any;
  sqlConfigSetting: any = {};
  CACHE_DURATION_SEC = 6000; //50 min
  MESSAGE_LEN = 2000;
  TENANT_LEN = 50;
  ORG_LEN = 200;
  STATUS_LEN = 50;
  REPO_LEN = 200;
  REPO_ID_LEN = 100;
  URL_LEN = 2000;
  STATE_LEN = 50;
  ACTION_LEN = 50;
  TITLE_LEN = 2000;
  BODY_LEN = 2000;
  LOGIN_LEN = 100;
  AVATAR_URL_LEN = 2000;
  USER_URL_LEN = 2000;

  constructor(obj: any) {
    //for get calls there may not be any obj
    if (obj) {
      this.pr = this.shredObject(obj);
      this.raw = obj.body;
    }

    if (!this.myCache) {
      this.myCache = new NodeCache({stdTTL: this.CACHE_DURATION_SEC, checkperiod: 120});

      // this.myCache  = new LabShareCache(new RedisStorage(
      //   {
      //        "host": "gator-cache.redis.cache.windows.net",
      //        "port": 6379
      //   }));
    }

    this.createPool().catch(ex => {
      console.log(`create pool failed: ${ex}`);
    });
  }

  async createPool() {
    if (!this.pool) {
      this.sqlConfigSetting.server = process.env.SQL_Server;
      this.sqlConfigSetting.database = process.env.SQL_Database;
      this.sqlConfigSetting.user = process.env.SQL_User;
      this.sqlConfigSetting.password = process.env.SQL_Password;
      this.sqlConfigSetting.port = 1433;
      this.sqlConfigSetting.encrypt = true;

      await new sql.ConnectionPool(this.sqlConfigSetting).connect().then((pool: any) => {
        this.pool = pool;
        //console.log(`==> createPool is successfull`);
      });
    }
  }

  //return 0 if not a valid tenant or the token more than 7 days old
  async checkToken(tenantId: number) {
    try {
      const cacheKey = 'CheckToken: ' + tenantId;
      //console.log (cacheKey);
      const val = this.myCache.get(cacheKey);
      if (val) {
        return val;
      }
      await this.createPool();
      const request = await this.pool.request();
      request.input('Id', sql.Int, tenantId);
      const recordSet = await request.execute('CheckTenant');
      if (recordSet) {
        this.myCache.set(cacheKey, recordSet.recordset[0].Result === 1);
        return recordSet.recordset[0].Result === 1;
      } else return false;
    } catch (ex) {
      console.log(`==> CheckToken ${ex}`);
      return false;
    }
  }

  async getGitLoggedInUSerDetails(tenantId: number, bustTheCache: Boolean = false) {
    try {
      const cacheKey = 'getGitLoggedInUSerDetails: ' + tenantId;
      if (!bustTheCache) {
        const val = this.myCache.get(cacheKey);
        if (val) {
          return val;
        }
      }

      await this.createPool();
      const request = await this.pool.request();
      request.input('TenantId', sql.Int, tenantId);
      const recordSet = await request.execute('getGitLoggedInUSerDetails');
      if (recordSet) {
        this.myCache.set(cacheKey, recordSet.recordset[0]);
        return recordSet.recordset[0];
      } else return false;
    } catch (ex) {
      console.log(`==> CheckToken ${ex}`);
      return false;
    }
  }

  dropTokenFromCache(tenantId: string) {
    let cacheKey = 'CheckToken: ' + tenantId;
    console.log('dropTokenFromCache: ' + cacheKey);
    this.myCache.del(cacheKey);
    cacheKey = 'GetTenant-' + tenantId;
    this.myCache.del(cacheKey);
  }

  dropJiraTokenFromCache(tenantId: string) {
    let cacheKey = 'CheckJiraToken: ' + tenantId;
    this.myCache.del(cacheKey);
    console.log('dropJiraTokenFromCache: ' + cacheKey);
    cacheKey = 'getJiraTenant-' + tenantId;
    this.myCache.del(cacheKey);
  }

  //return 0 if not a valid tenant or the token more than 7 days old
  async checkJiraToken(tenantId: string) {
    try {
      tenantId = tenantId.trim();
      const cacheKey = 'CheckJiraToken: ' + tenantId;
      // console.log (cacheKey);
      const val = this.myCache.get(cacheKey);
      if (val) {
        console.log('jira Token from cache');
        return val;
      } else {
        console.log('jira Token from DB');
      }
      await this.createPool();
      const request = await this.pool.request();
      request.input('Id', sql.Char, tenantId);
      const recordSet = await request.execute('CheckJiraTenant');
      if (recordSet) {
        this.myCache.set(cacheKey, recordSet.recordset[0].Result === 1);
        return recordSet.recordset[0].Result === 1;
      } else return false;
    } catch (ex) {
      console.log(`==> CheckJiraToken ${ex}`);
      return false;
    }
  }

  async getRepoPR(org: string, repo: string, day: string, pageSize: string) {
    try {
      const cacheKey = 'GetRepoPR' + org + repo + day;
      const val = this.myCache.get(cacheKey);
      if (val) {
        return val;
      }
      await this.createPool();
      const request = await this.pool.request();
      request.input('repo', sql.VarChar(this.REPO_LEN), repo);
      request.input('org', sql.VarChar(this.ORG_LEN), org);
      request.input('day', sql.Int, day);
      request.input('PageSize', sql.Int, pageSize);
      const recordSet = await request.execute('GetRepoPR');
      if (recordSet) {
        this.myCache.set(cacheKey, recordSet.recordset);
        return recordSet.recordset;
      } else return false;
    } catch (ex) {
      console.log(`==> getRepoPR {ex}`);
      return false;
    }
  }

  async getAllRepoCollection4TenantOrg(tenantId: string, org: string, bustTheCache: Boolean = false) {
    const cacheKey = 'getAllRepoCollection4TenantOrg' + org + tenantId;
    if (!bustTheCache) {
      const val = this.myCache.get(cacheKey);
      if (val) {
        return val;
      }
    }
    await this.createPool();
    const request = await this.pool.request();
    request.input('TenantId', sql.Int, Number(tenantId));
    request.input('Org', sql.VarChar(this.ORG_LEN), org);
    const recordSet = await request.execute('[GetAllRepoCollection4TenantOrg]');
    if (recordSet) {
      this.myCache.set(cacheKey, recordSet.recordset);
      return recordSet.recordset;
    } else return false;
  }

  async getDevs(tenantId: string, org: string) {
    await this.createPool();
    const request = await this.pool.request();
    request.input('org', sql.VarChar(this.ORG_LEN), org);
    request.input('TenantId', sql.Int, Number(tenantId));
    const recordSet = await request.execute('GetDevs');
    return recordSet.recordset;
  }

  // Date, Ctr, State (open, closed) will be returned

  async GetGraphData4XDays(org: string, day: number, bustTheCache: Boolean = false) {
    const cacheKey = 'GetGraphData4XDays-' + org + day;

    if (bustTheCache) {
      this.myCache.del(cacheKey);
    }

    const val = this.myCache.get(cacheKey);

    if (val) {
      return val;
    }

    await this.createPool();
    const request = await this.pool.request();
    request.input('day', sql.Int, day);
    request.input('org', sql.VarChar(this.ORG_LEN), org);
    const recordSet = await request.execute('GetGraphData4XDays');
    if (recordSet) {
      this.myCache.set(cacheKey, recordSet.recordset);
    }
    return recordSet.recordset;
  }

  async saveStatus(tenantId: string, status: string, message = '') {
    await this.createPool();
    const request = await this.pool.request();

    if (!message) {
      message = '';
    } else {
      if (message.length >= this.MESSAGE_LEN) {
        message = message.substr(0, this.MESSAGE_LEN - 2);
      }
    }

    request.input('status', sql.VarChar(this.STATUS_LEN), status);
    request.input('message', sql.VarChar(this.MESSAGE_LEN), message);
    request.input('TenantId', sql.Int, Number(tenantId));
    const recordSet = await request.execute('saveStatus');
    if (recordSet) {
      return recordSet.rowsAffected.length;
    } else {
      return 0;
    }
  }

  async getRepo(tenantId: string, org: string, bustTheCache: Boolean = false) {
    const cacheKey = 'GetRepo' + tenantId + org;

    if (bustTheCache) {
      this.myCache.del(cacheKey);
    }

    const val = this.myCache.get(cacheKey);

    if (val) {
      return val;
    }

    await this.createPool();
    const request = await this.pool.request();
    request.input('TenantId', sql.Int, Number(tenantId));
    request.input('Org', sql.VarChar(this.ORG_LEN), org);

    const recordSet = await request.execute('GetRepos');
    if (recordSet) {
      this.myCache.set(cacheKey, recordSet.recordset);
    }
    return recordSet.recordset;
  }

  async getOrg(tenantId: string, bustTheCache: Boolean = false) {
    const cacheKey = 'GetOrg' + tenantId;

    if (bustTheCache) {
      this.myCache.del(cacheKey);
    }

    const val = this.myCache.get(cacheKey);

    if (val) {
      return val;
    }

    await this.createPool();
    const request = await this.pool.request();
    request.input('TenantId', sql.Int, Number(tenantId));
    const recordSet = await request.execute('GetOrg');
    if (recordSet.recordset) {
      this.myCache.set(cacheKey, recordSet.recordset);
    }
    return recordSet.recordset;
  }

  async getJiraOrg(tenantId: string, bustTheCache: Boolean = false) {
    const orgs: any = await this.getJiraOrgs(tenantId, bustTheCache);
    const val = orgs[0].id; //default returning the first one
    return val;
  }

  async getJiraOrgs(tenantId: string, bustTheCache: Boolean = false) {
    const cacheKey = 'GetJiraOrgs:' + tenantId;
    // console.log (cacheKey);
    let orgs: any;
    if (bustTheCache) {
      console.log(' ==>GetJiraOrg: hitting the cache.');
      this.myCache.del(cacheKey);
    }

    const val = this.myCache.get(cacheKey);

    if (val) {
      console.log('getJiraOrgs hitting the cache');
      return val;
    }

    await this.createPool();
    const request = await this.pool.request();
    request.input('TenantId', sql.Char, tenantId);
    const recordSet = await request.execute('GetJiraOrg');

    if (recordSet.recordset) {
      orgs = JSON.parse(recordSet.recordset[0].AccessibleResources);
      this.myCache.set(cacheKey, orgs);
      //      console.log (cacheKey + ' Found orgs!!!');
    } else {
      console.log(cacheKey + ' NOT Found orgs!!!');
    }
    return orgs;
  }

  async getJiraUsers(tenantId: string, org: string, bustTheCache: Boolean = false) {
    const cacheKey = `getJiraUsers: tenantId: ${tenantId}  org: ${org}`;
    console.log(cacheKey);

    if (bustTheCache) {
      this.myCache.del(cacheKey);
    }

    const val = this.myCache.get(cacheKey);

    if (val) {
      console.log('getJiraUsers hitting the cache');
      return val;
    }

    await this.createPool();
    const request = await this.pool.request();
    request.input('TenantId', sql.Char, tenantId);
    request.input('Org', sql.Char, org);
    const recordSet = await request.execute('GetJiraUsers');
    if (recordSet.recordset.length > 0) {
      this.myCache.set(cacheKey, recordSet.recordset);
      console.log(`Found: ${recordSet.recordset.length} records for org: ${org} `);
      return recordSet.recordset;
    } else return null;
  }

  //No one calls this yet, the SP is called directly from another SP GetTenant. Leaving for future use.
  async setActiveTenant(id: number) {
    await this.createPool();
    const request = await this.pool.request();
    request.input('TenantId', sql.Int, id);
    const recordSet = await request.execute('SaveActiveTenant');
    if (recordSet) {
      return recordSet.rowsAffected.length;
    } else return 0;
  }

  //Token will return UserName, DisplayName, ProfileURL, AuthToken, LastUpdated and Photo (URL)

  async getTenant(id: number) {
    const cacheKey = 'GetTenant-' + id;
    const val = this.myCache.get(cacheKey);
    if (val) {
      return val;
    }
    await this.createPool();
    const request = await this.pool.request();
    request.input('Id', sql.Int, id);
    const recordSet = await request.execute('GetTenant');
    if (recordSet.recordset.length > 0) {
      this.myCache.set(cacheKey, recordSet.recordset);
      // console.log(`==> getTenant is successfull for id:${id} `);
      return recordSet.recordset;
    } else return 0;
  }

  async getJiraTenant(id: string) {
    const cacheKey = 'getJiraTenant-' + id;
    const val = this.myCache.get(cacheKey);
    if (val) {
      console.log('getJiraTenant hitting the cache');
      return val;
    }
    await this.createPool();
    const request = await this.pool.request();
    request.input('Id', sql.Char, id);
    const recordSet = await request.execute('GetJiraTenant');
    if (recordSet.recordset.length > 0) {
      this.myCache.set(cacheKey, recordSet.recordset);
      // console.log(`==> getJiraTenant is successfull for id:${id} `);
      return recordSet.recordset;
    } else return 0;
  }

  //GetPR4Repo
  async getPR4Repo(org: string, repo: string, bustTheCache = false) {
    await this.createPool();
    const cacheKey = 'GetPR4Repo -' + org + repo;
    if (bustTheCache) {
      this.myCache.delete(cacheKey);
    } else {
      const val = this.myCache.get(cacheKey);
      if (val) {
        return val;
      }
    }
    const request = await this.pool.request();

    request.input('org', sql.VarChar(this.ORG_LEN), org);
    request.input('repo', sql.VarChar(this.REPO_LEN), repo);

    const recordSet = await request.execute('GetPR4Repo');
    if (recordSet.recordset.length > 0) {
      this.myCache.set(cacheKey, recordSet.recordset);
      return recordSet.recordset;
    } else {
      return 0;
    }
  }

  async getToken(id: number) {
    const cacheKey = 'GetTenant -' + id; //cacheKey is GetTenant because i am reading there cache value. This is different from norm
    const val = this.myCache.get(cacheKey);
    if (val) {
      return this.decrypt(val.recordset[0].Auth_Token, id.toString());
    }
    const recordSet = await this.getTenant(id);
    if (recordSet) return this.decrypt(recordSet[0].Auth_Token, id.toString());
    else return;
  }

  async getJiraToken(id: string) {
    const recordSet = await this.getJiraTenant(id);
    if (recordSet) return recordSet[0].Auth_Token;
    else return;
  }

  async getTopDev4LastXDays(org: string, day = 1) {
    const cacheKey = 'getTopDev4LastXDays' + org + day;
    const val = this.myCache.get(cacheKey);
    if (val) {
      return val;
    }

    await this.createPool();
    const request = await this.pool.request();
    if (!org) {
      throw new Error('tenant cannot be null');
    }
    request.input('Org', sql.VarChar(this.ORG_LEN), org);
    request.input('Day', sql.Int, day);
    const recordSet = await request.execute('TopDevForLastXDays');
    if (recordSet.recordset) {
      this.myCache.set(cacheKey, recordSet.recordset);
      return recordSet.recordset;
    } else {
      return;
    }
  }

  async getGitDev4Org(org: string) {
    const cacheKey = 'getGitDev4Org' + org ;
    const val = this.myCache.get(cacheKey);
    if (val) {
      return val;
    }

    await this.createPool();
    const request = await this.pool.request();
    if (!org) {
      throw new Error('tenant cannot be null');
    }
    request.input('Org', sql.VarChar(this.ORG_LEN), org);
    const recordSet = await request.execute('GitDev4Org');
    if (recordSet.recordset) {
      this.myCache.set(cacheKey, recordSet.recordset);
      return recordSet.recordset;
    } else {
      return;
    }
  }

  async getPR4Id(org: string, id = 1) {
    await this.createPool();
    const request = await this.pool.request();
    if (!org) {
      throw new Error('tenant cannot be null');
    }
    request.input('Org', sql.VarChar(this.ORG_LEN), org);
    request.input('Id', sql.Int, id);
    const recordSet = await request.execute('GetPR4Id');
    return recordSet.recordset;
  }

  async getPRCount4LastXDays(org: string, day = 1) {
    await this.createPool();
    const cacheKey = 'PRCount4LastXDays' + org + day.toString();
    const val = this.myCache.get(cacheKey);
    if (val) {
      return val;
    }

    const request = await this.pool.request();
    if (!org) {
      throw new Error('org cannot be null');
    }
    request.input('Org', sql.VarChar(this.ORG_LEN), org);
    request.input('Day', sql.Int, day);
    const recordSet = await request.execute('PRCount4LastXDays');
    if (recordSet.recordset.length > 0) {
      this.myCache.set(cacheKey, recordSet.recordset);
    }
    return recordSet.recordset;
  }

  async getPR4Dev(org: string, day = 1, login: string, action: string, pageSize: number) {
    if (!org) {
      console.log(`==> Exiting getPRDev org cannot be null`);
      return;
    }

    //login can be null, it is a special case, in that case data come for all the devs - count
    const cacheKey = 'PullRequest4Dev' + org + day.toString() + login;
    //  console.log(`getPR4Dev: org:${org} day: ${day} login: ${login} action: ${action} pageSize: ${pageSize}`);
    const val = this.myCache.get(cacheKey);
    if (val) {
      return val;
    }
    console.log('** getPRDev Cache miss **');
    await this.createPool();
    const request = await this.pool.request();

    if (pageSize === 0) pageSize = 10;

    request.input('Org', sql.VarChar(this.ORG_LEN), org);

    if (isNullOrUndefined(login) || login === '') {
      request.input('Login', sql.VarChar(this.LOGIN_LEN), 'null');
    } else {
      request.input('Login', sql.VarChar(this.LOGIN_LEN), login);
    }

    if (isNullOrUndefined(action) || action === '') {
      request.input('Action', sql.VarChar(this.ACTION_LEN), 'null');
    } else {
      request.input('Action', sql.VarChar(this.ACTION_LEN), action);
    }

    request.input('Day', sql.Int, day);
    request.input('pageSize', sql.Int, pageSize);
    const recordSet = await request.execute('PR4Devs');
    // console.log(`getPR4Dev records found: ${recordSet.recordset.length}`);
    if (recordSet.recordset.length > 0) {
      this.myCache.set(cacheKey, recordSet.recordset);
    }
    return recordSet.recordset;
  }

  /*
  PullRequest took longest time between open and close
  */
  async getLongestPR(org: string, day = 1) {
    await this.createPool();
    const request = await this.pool.request();
    if (!org) {
      throw new Error('org cannot be null');
    }
    request.input('Org', sql.VarChar(this.ORG_LEN), org);
    request.input('Day', sql.Int, day);
    const recordSet = await request.execute('LongestPR');
    return recordSet.recordset;
  }

  async getTopRepo4XDays(org: string, day = 1) {
    const cacheKey = 'getTopRepo4XDays' + org + day.toString();
    const val = this.myCache.get(cacheKey);
    if (val) {
      return val;
    }
    await this.createPool();
    const request = await this.pool.request();
    if (!org) {
      throw new Error('org cannot be null');
    }
    request.input('Org', sql.VarChar(this.ORG_LEN), org);
    request.input('Day', sql.Int, day);
    const recordSet = await request.execute('GetTopRepos4XDays');
    if (recordSet) {
      this.myCache.set(cacheKey, recordSet.recordset);
    }
    return recordSet.recordset;
  }

  async getPR4LastXDays(org: string, day = 1) {
    const cacheKey = 'getPR4LastXDays' + org + day.toString();
    const val = this.myCache.get(cacheKey);
    if (val) {
      return val;
    }
    await this.createPool();
    const request = await this.pool.request();
    if (!org) {
      throw new Error('org cannot be null');
    }
    request.input('Org', sql.VarChar(this.ORG_LEN), org);
    request.input('Day', sql.Int, day);
    const recordSet = await request.execute('PR4LastXDays');
    if (recordSet) {
      this.myCache.set(cacheKey, recordSet.recordset);
    }
    return recordSet.recordset;
  }

  async getItem(query: string, page: number, pageSize: number) {
    try {
      await this.createPool();
      const request = await this.pool.request();
      const rs = await request.query(query);
      const results = rs.recordset;
      if (isNaN(page)) {
        page = 1;
      }
      if (page === 0) {
        page = 1;
      }
      if (isNaN(pageSize)) {
        pageSize = 10;
      }
      if (pageSize === 0) {
        pageSize = 10;
      }

      let s = '[';
      let ctr = 0;
      let startCtr: number = (page - 1) * pageSize;
      if (startCtr === 0) {
        startCtr = 1;
      }
      let endCtr: number = page * pageSize;

      if (endCtr > results.length) {
        endCtr = results.length;
      }

      for (const result of results) {
        ctr = ctr + 1;
        if (ctr >= startCtr && ctr <= endCtr) {
          s = s + JSON.stringify(result);
          if (ctr < endCtr) {
            s = s + ','; //last element does not need the comma
          }
        }
      }
      s = s + ']';
      return s;
    } catch (err) {
      console.log(err);
    }
  }

  async saveJiraTenant(tenant: JiraTenant) {
    try {
      // console.log('==> inside saveTenant');
      await this.createPool();
      const request = await this.pool.request();
      if (!tenant.Photo) {
        tenant.Photo = '';
      }
      if (!tenant.DisplayName) {
        tenant.DisplayName = '';
      }
      //Token is kept decrypted in DB
      const token = tenant.AuthToken; //No Encryption for Jira
      request.input('Id', sql.Char, tenant.Id);
      request.input('email', sql.VarChar(200), tenant.Email);
      request.input('UserName', sql.VarChar(200), tenant.UserName);
      request.input('DisplayName', sql.VarChar(200), tenant.DisplayName);
      request.input('ProfileUrl', sql.Char(500), tenant.ProfileUrl);
      request.input('AuthToken', sql.VARCHAR(4000), token);
      request.input('RefreshToken', sql.VARCHAR(4000), tenant.RefreshToken);
      request.input('Photo', sql.Char(500), tenant.Photo);
      request.input('AccessibleResources', sql.Char(8000), JSON.stringify(tenant.AccessibleResources));
      const recordSet = await request.execute('SaveJiraTenant');
      console.log('==> saveJiraTenant done successfully');
      return recordSet.rowsAffected[0];
    } catch (ex) {
      console.log(`==> ${ex}`);
      return ex;
    }
  }

  async saveMSR(srId: number, userId: string, org: string, statusDetails: string, reviewer: string, status: number, links: string, manager: string, managerComment: string, managerStatus: number) {
    try {
      const request = await this.pool.request();
      request.input('SRId', sql.Int, srId);
      request.input('UserId', sql.VarChar(100), userId);
      request.input('Org', sql.VarChar(200), org);
      request.input('StatusDetails', sql.VarChar(200), statusDetails);
      request.input('Reviewer', sql.VarChar(500), reviewer);
      request.input('Status', sql.Int, status);
      request.input('Links', sql.VarChar(1000), links);

      request.input('Manager', sql.VarChar(1000), manager);
      request.input('ManagerComment', sql.VarChar(4000), managerComment);
      request.input('ManagerStatus', sql.Int, managerStatus);

      const recordSet = await request.execute('SaveMSR');
      console.log('==> saveMSR done successfully');
      return recordSet.rowsAffected[0];
    } catch (ex) {
      console.log(`==> ${ex}`);
      return ex;
    }
  }

  async getSR4Id(srId: number, bustTheCache: boolean) {
    try {
      const cacheKey = 'getMSR4Id' + srId;
      if (!bustTheCache) {
        const val = this.myCache.get(cacheKey);
        if (val) {
          return val;
        }
      }
      const request = await this.pool.request();
      request.input('Id', sql.Int, srId);

      const recordSet = await request.execute('GetSR4Id');
      if (recordSet) {
        this.myCache.set(cacheKey, recordSet.recordset);
      }
      return recordSet.recordset;
    } catch (ex) {
      console.log(`==> ${ex}`);
      return ex;
    }
  }

  async getSR4User(userId: string, bustTheCache: boolean) {
    try {
      const cacheKey = 'getMSR4User' + userId;
      if (!bustTheCache) {
        const val = this.myCache.get(cacheKey);
        if (val) {
          return val;
        }
      }
      const request = await this.pool.request();
      request.input('UserId', sql.VarChar(100), userId);

      const recordSet = await request.execute('GetSR4User');
      if (recordSet) {
        this.myCache.set(cacheKey, recordSet.recordset);
      }
      return recordSet.recordset;
    } catch (ex) {
      console.log(`==> ${ex}`);
      return ex;
    }
  }

  async GetSR4User4Review(userId: string, status: number, bustTheCache: boolean) {
    try {
      const cacheKey = 'GetSR4User4Review' + userId + status;
      if (!bustTheCache) {
        const val = this.myCache.get(cacheKey);
        if (val) {
          return val;
        }
      }
      const request = await this.pool.request();
      request.input('UserId', sql.VarChar(100), userId);
      request.input('Status', sql.Int, status);
      const recordSet = await request.execute('GetSR4User4Review');
      if (recordSet) {
        this.myCache.set(cacheKey, recordSet.recordset);
      }
      return recordSet.recordset;
    } catch (ex) {
      console.log(`==> ${ex}`);
      return ex;
    }
  }

  async saveTenant(tenant: Tenant) {
    try {
      // console.log('==> inside saveTenant');
      await this.createPool();
      const request = await this.pool.request();
      if (!tenant.Photo) {
        tenant.Photo = '';
      }
      if (!tenant.DisplayName) {
        tenant.DisplayName = '';
      }

      const token = this.encrypt(tenant.AuthToken, tenant.Id.toString());
      request.input('Id', sql.Int, tenant.Id);
      request.input('email', sql.VarChar(200), tenant.Email);
      request.input('UserName', sql.VarChar(200), tenant.UserName);
      request.input('DisplayName', sql.VarChar(200), tenant.DisplayName);
      request.input('ProfileUrl', sql.VarChar(1000), tenant.ProfileUrl);
      request.input('AuthToken', sql.VarChar(4000), token);
      request.input('RefreshToken', sql.VarChar(4000), tenant.RefreshToken);
      request.input('Photo', sql.VarChar(1000), tenant.Photo);
      const recordSet = await request.execute('SaveTenant');
      console.log('==> saveTenant done successfully');
      return recordSet.rowsAffected[0];
    } catch (ex) {
      console.log(`==> ${ex}`);
      return ex;
    }
  }

  encrypt(token: string, secret: string) {
    const ciphertext = CryptoJS.AES.encrypt(token, secret);
    return ciphertext;
  }

  decrypt(token: string, secret: string) {
    const bytes = CryptoJS.AES.decrypt(token, secret);
    const plaintext = bytes.toString(CryptoJS.enc.Utf8);
    return plaintext;
  }

  /*
    Saves only action === 'opened' || action === 'closed' || action === 'edited'
  */
  async savePR4Repo(org: string, repo: string, body: string) {
    try {
      await this.createPool();
      const pr = JSON.parse(body);
      let id: string;
      let url: string;
      let state: string;
      let title: string;
      let created_at: string;
      let pr_body: string;
      let login: string;
      let avatar_url: string;
      let user_url: string;

      const request = await this.pool.request();
      const nodes = pr.data.viewer.organization.repository.pullRequests.nodes;
      if (nodes === undefined) {
        console.log(`==> No PR found for org: ${org} Repo: ${repo}`);
      }
      if (nodes.length === 0) {
        console.log(`==> No PR found for org: ${org} Repo: ${repo}`);
      }

      if (nodes.length > 0) {
        console.log(`==> ${nodes.length} PR found for org: ${org} Repo: ${repo}`);
      }

      //nodes.forEach(async (elm: any) => {
      for (const elm of nodes) {
        if (elm.author.login === undefined) {
          console.log('login is invalid');
          continue;
        }
        if (elm.author.login.startsWith('greenkeep')) continue;
        if (elm.author.login.startsWith('semantic-release-bot')) continue;
        if (elm.action === 'opened' || elm.action === 'closed' || elm.action === 'edited') {
          //move on
        } else {
          continue;
        }
        id = elm.id;
        url = elm.url;
        state = elm.action; //Found out state has too much noise but action open and close is better
        title = elm.title;
        created_at = elm.createdAt;
        pr_body = elm.body;
        if (!pr_body) {
          pr_body = ' ';
        }
        if (pr_body.length > 1999) {
          pr_body = pr_body.substr(0, 1998);
        }
        login = elm.author.login;
        avatar_url = elm.author.avatarUrl;
        user_url = elm.author.url;

        request.input('Id', sql.VarChar(200), id);
        request.input('Org', sql.VarChar(this.ORG_LEN), org);
        request.input('Repo', sql.VarChar(this.REPO_LEN), repo);
        request.input('Url', sql.VarChar(this.URL_LEN), url);
        request.input('State', sql.VarChar(this.STATE_LEN), state);
        request.input('Title', sql.VarChar(this.TITLE_LEN), title);
        request.input('Created_At', sql.VarChar(20), created_at);
        request.input('Body', sql.VarChar(this.BODY_LEN), pr_body);
        request.input('Login', sql.VarChar(this.LOGIN_LEN), login);
        request.input('Avatar_Url', sql.VarChar(this.AVATAR_URL_LEN), avatar_url);
        request.input('User_Url', sql.VarChar(this.USER_URL_LEN), user_url);
        try {
          const x = await request.execute('SavePR4Repo');
          return x.rowsAffected[0];
        } catch (ex) {
          console.log(`==> Error! While saving PR for org:${org} repo: ${repo} - ${ex}`);
        }
      }
    } catch (ex) {
      return false;
    }
    return true;
  }

  /* return number of orgs */

  async saveOrg(tenantId: string, orgs: string[]) {
    try {
      await this.createPool();
      const request = await this.pool.request();
      for (const o of orgs) {
        const org: any = o;
        request.input('TenantId', sql.Int, Number(tenantId));
        request.input('Org', sql.VarChar(this.ORG_LEN), org.url.substr('https://github.com/'.length));
        request.input('DisplayName', sql.VarChar(this.ORG_LEN), org.name);
        await request.execute('SaveOrg');
      }
      return orgs.length;
    } catch (ex) {
      return ex;
    }
  }

  async saveJiraUsers(tenantId: string, org: string, devs: string[]) {
    try {
      if (devs === undefined) return;
      if (devs.length === 0) {
        console.log('No devs to be saved!');
        return;
      }
      await this.createPool();
      const request = await this.pool.request();

      for (const d of devs) {
        let dev: any = d;
        // const createdAt = String(dev.createdAt).substr(0, 10);
        //console.log(`==> SaveDev = org: ${org} dev - Name: ${dev.name} \t| Email: ${dev.email} \t| login: ${dev.login} \t| ${dev.avatarUrl}`);
        request.input('TenantId', sql.Char, tenantId);
        request.input('Org', sql.VarChar(this.ORG_LEN), org); //
        request.input('accountId', sql.VarChar(100), dev.accountId); //rsarosh@hotmail.com
        request.input('displayName', sql.VarChar(200), dev.displayName); //Rafat Sarosh
        request.input('avatarUrls', sql.Text, JSON.stringify(dev.avatarUrls)); //rsarosh
        request.input('self', sql.VarChar(500), dev.self);
        await request.execute('SaveJiraUsers');
        //return recordSet.rowsAffected[0];
      }
      console.log(`saved ${devs.length} Jira Dev for org: ${org}`);
    } catch (ex) {
      return ex;
    }
  }

  async saveDevs(tenantId: string, org: string, devs: string[]) {
    try {
      if (devs === undefined) return;
      if (devs.length === 0) {
        console.log('No devs to be saved!');
        return;
      }

      await this.createPool();
      const request = await this.pool.request();

      for (const d of devs) {
        let dev: any = d;
        //console.log(`==> SaveDev = org: ${org} dev - Name: ${dev.name} \t| Email: ${dev.email} \t| login: ${dev.login} \t| ${dev.avatarUrl}`);
        request.input('TenantId', sql.Int, Number(tenantId));
        request.input('Org', sql.VarChar(this.ORG_LEN), org); //
        request.input('email', sql.VarChar(200), dev.email); //rsarosh@hotmail.com
        request.input('name', sql.VarChar(200), dev.name); //Rafat Sarosh
        request.input('login', sql.VarChar(this.LOGIN_LEN), dev.login); //rsarosh
        request.input('avatarUrl', sql.VarChar(1200), dev.avatarUrl);
        await request.execute('SaveDev');
        //return recordSet.rowsAffected[0];
      }
      // console.log(`saved ${devs.length} Git Dev`);
      return devs.length;
    } catch (ex) {
      return ex;
    }
  }

  async saveRepo(tenantId: string, org: string, repos: string[]) {
    try {
      if (repos === undefined) return;
      if (repos.length === 0) {
        console.log('No repo to be saved!');
        return;
      }
      await this.createPool();
      const request = await this.pool.request();
      for (const r of repos) {
        let repo: any = r;
        const createdAt = String(repo.createdAt).substr(0, 10);
        // console.log(`SaveRepo = org: ${org} repo: ${repo.name}`);
        request.input('TenantId', sql.Int, Number(tenantId));
        request.input('Org', sql.VarChar(this.ORG_LEN), org);
        request.input('Id', sql.VarChar(this.REPO_ID_LEN), repo.id);
        request.input('name', sql.VarChar(this.REPO_LEN), repo.name);
        request.input('desc', sql.VarChar(200), repo.description);
        request.input('HomePage', sql.VarChar(200), repo.homepageUrl);
        request.input('CreatedAt', sql.VarChar(10), createdAt);
        const recordSet = await request.execute('SaveRepos');
        return recordSet.rowsAffected[0];
      }
    } catch (ex) {
      return ex;
    }
  }

  private shredObject(obj: any): PullRequest {
    const pr: PullRequest = new PullRequest();

    try {
      pr.Org = _.get(obj.body, 'organization.login');
      pr.Login = _.get(obj.body, 'pull_request.user.login');
      pr.Action = _.get(obj.body, 'action');
      pr.PullRequestId = parseInt(_.get(obj.body, 'number'));
      pr.PullRequestUrl = _.get(obj.body, 'pull_request.url');
      pr.State = _.get(obj.body, 'pull_request.state');
      pr.Avatar_Url = _.get(obj.body, 'pull_request.user.avatar_url');
      pr.User_Url = _.get(obj.body, 'pull_request.user.url');
      pr.Created_At = _.get(obj.body, 'pull_request.created_at');
      pr.Body = _.get(obj.body, 'pull_request.body');
      pr.Teams_Url = _.get(obj.body, 'pull_request.base.repo.teams_url');
      pr.Repo_Name = _.get(obj.body, 'pull_request.base.repo.name');
      pr.Repo_FullName = _.get(obj.body, 'pull_request.base.repo.full_name');
      pr.Repo_Description = _.get(obj.body, 'pull_request.base.repo.description');
      pr.Links = JSON.stringify(_.get(obj.body, 'pull_request._links'));
      pr.PullId = _.get(obj.body, 'pull_request.url');
    } catch (err) {
      console.log(`==> ${err}`);
    }

    return pr;
  }
}

export {SQLRepository, Tenant, JiraTenant};
