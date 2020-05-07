const sql = require('mssql');
import * as _ from 'lodash';
import {isNullOrUndefined} from 'util';
// import {EMLINK} from 'constants';
//import {RedisStorage, LabShareCache} from "@labshare/services-cache";
const NodeCache = require('node-cache');
const dotenv = require('dotenv');
dotenv.config();
const CryptoJS = require('crypto-js');

class ErrorObj {
  code: number;
  message: string;
  constructor(code: number, message: string) {
    this.code = code;
    this.message = message;
  }
}
class Node {
  parent: any;
  child: any[];
  constructor() {
    this.child = new Array<any>();
  }
}

class TNode {
  label: string;
  data: string;
  expandedIcon: string;
  collapsedIcon: string;
  children: TNode[];
  constructor() {
    this.children = new Array<TNode>();
  }
}
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

class GUser {
  Id: number;
  Email: string;
  UserName: string;
  DisplayName: string;
  ProfileUrl: String;
  AuthToken: string;
  RefreshToken: string;
  Photo: string;
}

class JiraUser {
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
  CACHE_DURATION_SEC = process.env.CACHE_DURATION_SEC; //50 min
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
      console.log(`[E] create pool failed: ${ex}`);
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
      // this.sqlConfigSetting.options = '{ trustedConnection: true} ';
      // this.sqlConfigSetting.driver = 'msnodesqlv8';
      await new sql.ConnectionPool(this.sqlConfigSetting).connect().then((pool: any) => {
        this.pool = pool;
      });
    }
  }

  //return 0 if not a valid user or the token more than 7 days old
  async checkUser(userId: number) {
    const cacheKey = 'CheckUser: ' + userId;
    try {
      const val = this.myCache.get(cacheKey);
      if (val) {
        return val;
      }
      await this.createPool();
      const request = await this.pool.request();
      request.input('Id', sql.Int, userId);
      const recordSet = await request.execute('CheckUser');
      if (recordSet) {
        this.myCache.set(cacheKey, recordSet.recordset[0].Result === 1);
        return recordSet.recordset[0].Result === 1;
      } else return false;
    } catch (ex) {
      console.log(`[E]  ${cacheKey}  Error: ${ex}`);
      return false;
    }
  }

  async getLoggedInUSerDetails(userId: number, bustTheCache: Boolean = false) {
    const cacheKey = 'getLoggedInUSerDetails: ' + userId;
    try {
      if (!bustTheCache) {
        const val = this.myCache.get(cacheKey);
        if (val) {
          return val;
        }
      }
      await this.createPool();
      const request = await this.pool.request();
      request.input('UserId', sql.Int, userId);
      const recordSet = await request.execute('getLoggedInUSerDetails');
      if (recordSet) {
        this.myCache.set(cacheKey, recordSet.recordset[0]);
        return recordSet.recordset[0];
      } else return false;
    } catch (ex) {
      console.log(`[E]  ${cacheKey}  Error: ${ex}`);
      return false;
    }
  }

  // dropTokenFromCache(tenantId: string) {
  //   let cacheKey = 'checkUser: ' + tenantId;
  //   this.myCache.del(cacheKey);
  //   cacheKey = 'GetUser-' + tenantId;
  //   this.myCache.del(cacheKey);
  // }

  dropJiraTokenFromCache(tenantId: string) {
    let cacheKey = 'CheckJiraToken: ' + tenantId;
    this.myCache.del(cacheKey);
    console.log('dropJiraTokenFromCache: ' + cacheKey);
    cacheKey = 'getJiraTenant-' + tenantId;
    this.myCache.del(cacheKey);
  }

  //return 0 if not a valid user or the token more than 7 days old
  async checkJiraToken(tenantId: string) {
    if (!tenantId) {
      console.log(`[E] checkJiraToken tenantId is empty.`);
      return;
    }
    const cacheKey = 'CheckJiraToken: ' + tenantId;
    try {
      tenantId = tenantId.trim();

      // console.log (cacheKey);
      const val = this.myCache.get(cacheKey);
      if (val) {
        //console.log('jira Token from cache');
        return val;
      } else {
        //console.log('jira Token from DB');
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
      console.log(`[E]  ${cacheKey} -  ${ex}`);
      return false;
    }
  }

  async getRepoPR(org: string, repo: string, day: string, pageSize: string) {
    const cacheKey = 'GetRepoPR' + org + repo + day;
    try {
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
      console.log(`[E]  ${cacheKey} - ${ex}`);
      return false;
    }
  }

  async getAllRepoCollection4TenantOrg(tenantId: string, org: string, bustTheCache: Boolean = false) {
    const cacheKey = 'getAllRepoCollection4TenantOrg' + org + tenantId;
    try {
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
    } catch (ex) {
      console.log(`[E]  ${cacheKey} - ${ex}`);
      return false;
    }
  }

  //No caller
  async GetOrgDetail4UserId_Org(userId: string, org: string, bustTheCache: Boolean = false) {
    const cacheKey = `GetOrgDetail4UserId_Org: ${userId} org: ${org}`;
    try {
      if (bustTheCache) {
        this.myCache.del(cacheKey);
      }
      const val = this.myCache.get(cacheKey);
      if (val) {
        return val;
      }
      await this.createPool();
      const request = await this.pool.request();
      request.input('org', sql.VarChar(this.ORG_LEN), org);
      request.input('UserId', sql.Int, Number(userId));
      const recordSet = await request.execute('GetOrgDetail4UserId_Org');
      if (recordSet) {
        this.myCache.set(cacheKey, recordSet.recordset);
      }
      return recordSet.recordset;
    } catch (ex) {
      console.log(`${cacheKey}  Error: ${ex}`);
      return null;
    }
  }

  // Date, Ctr, State (open, closed) will be returned

  async GetGraphData4XDays(org: string, day: number, login: string, bustTheCache: Boolean = false) {
    const cacheKey = 'GetGraphData4XDays-' + org + login + day;
    try {
      if (bustTheCache) {
        this.myCache.del(cacheKey);
      }
      const val = this.myCache.get(cacheKey);
      if (val) {
        return val;
      }
      await this.createPool();
      const request = await this.pool.request();
      request.input('Day', sql.Int, day);
      request.input('Login', sql.VarChar(this.LOGIN_LEN), login);
      request.input('Org', sql.VarChar(this.ORG_LEN), org);
      const recordSet = await request.execute('GetGraphData4XDays');
      if (recordSet) {
        this.myCache.set(cacheKey, recordSet.recordset);
      }
      return recordSet.recordset;
    } catch (ex) {
      console.log(`${cacheKey}  Error: ${ex}`);
      return null;
    }
  }

  async saveStatus(tenantId: string, status: string, message = '') {
    try {
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
    } catch (ex) {
      console.log(`[E]  saveStatus: ${tenantId} ${status}  Error: ${ex}`);
      return 0;
    }
  }

  async getRepo(tenantId: string, org: string, bustTheCache: Boolean = false) {
    const cacheKey = `GetRepo: tenantId: ${tenantId} org: ${org}`;
    try {
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
    } catch (ex) {
      console.log(`[E]  ${cacheKey}  Error: ${ex}`);
      return null;
    }
  }

  //returbs   // [{"Org":"LabShare","DisplayName":"LabShare",OrgType: git ot Org}
  async getOrg4UserId(userId: string, bustTheCache: Boolean = false) {
    const cacheKey = 'getOrg4UserId' + userId;
    try {
      if (bustTheCache) {
        this.myCache.del(cacheKey);
      }
      const val = this.myCache.get(cacheKey);
      if (val) {
        return val;
      }
      await this.createPool();
      const request = await this.pool.request();
      request.input('UserId', sql.Int, Number(userId));
      const recordSet = await request.execute('GetOrg4UserId');
      if (recordSet.recordset) {
        this.myCache.set(cacheKey, recordSet.recordset);
      }
      return recordSet.recordset;
    } catch (ex) {
      console.log(`[E]  ${cacheKey}  Error: ${ex}`);
      return null;
    }
  }

  async getJiraOrg(tenantId: string, bustTheCache: Boolean = false) {
    const orgs: any = await this.getJiraOrgs(tenantId, bustTheCache);
    const val = orgs[0].id; //default returning the first one
    return val;
  }

  async getJiraOrgs(tenantId: string, bustTheCache: Boolean = false) {
    const cacheKey = 'GetJiraOrgs:' + tenantId;
    let orgs: any;
    try {
      if (bustTheCache) {
        this.myCache.del(cacheKey);
      }
      const val = this.myCache.get(cacheKey);
      if (val) {
        return val;
      }
      await this.createPool();
      const request = await this.pool.request();
      request.input('TenantId', sql.Char, tenantId);
      const recordSet = await request.execute('GetJiraOrg');

      if (recordSet.recordset) {
        orgs = JSON.parse(recordSet.recordset[0].AccessibleResources);
        this.myCache.set(cacheKey, orgs);
      } else {
        console.log(cacheKey + ' NOT Found orgs!!!');
      }
      return orgs;
    } catch (ex) {
      console.log(`[E]  ${cacheKey}  Error: ${ex}`);
      return orgs;
    }
  }

  async getJiraUsers(tenantId: string, org: string, bustTheCache: Boolean = false) {
    try {
      const cacheKey = `getJiraUsers: tenantId: ${tenantId}  org: ${org}`;
      if (bustTheCache) {
        this.myCache.del(cacheKey);
      }
      const val = this.myCache.get(cacheKey);
      if (val) {
        return val;
      }
      await this.createPool();
      const request = await this.pool.request();
      request.input('TenantId', sql.Char, tenantId);
      request.input('Org', sql.Char, org);
      const recordSet = await request.execute('GetJiraUsers');
      if (recordSet.recordset.length > 0) {
        this.myCache.set(cacheKey, recordSet.recordset);
        return recordSet.recordset;
      } else return null;
    } catch (ex) {
      console.log(`[E]  getJiraUsers id: ${tenantId} org: ${org} Error: ${ex}`);
      return null;
    }
  }

  //No one calls this yet, the SP is called directly from another SP GetUser.
  //Leaving for future use.

  async setActiveTenant(id: number) {
    try {
      await this.createPool();
      const request = await this.pool.request();
      request.input('TenantId', sql.Int, id);
      const recordSet = await request.execute('SaveActiveTenant');
      if (recordSet) {
        return recordSet.rowsAffected.length;
      } else return 0;
    } catch (ex) {
      console.log(`[E] setActiveTenant id: ${id} Error: ${ex}`);
      return 0;
    }
  }

  //Token will return UserName, DisplayName, ProfileURL, AuthToken, LastUpdated and Photo (URL)

  async getUser(id: number) {
    try {
      const cacheKey = 'getUser-' + id;
      const val = this.myCache.get(cacheKey);
      if (val) {
        return val;
      }
      await this.createPool();
      const request = await this.pool.request();
      request.input('Id', sql.Int, id);
      const recordSet = await request.execute('GetUser');
      if (recordSet.recordset.length > 0) {
        this.myCache.set(cacheKey, recordSet.recordset);
        return recordSet.recordset;
      } else return 0;
    } catch (ex) {
      console.log(`[E] getUser id: ${id} Error: ${ex}`);
      return 0;
    }
  }

  async getJiraTenant(id: string) {
    const cacheKey = 'getJiraTenant-' + id;
    try {
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
        return recordSet.recordset;
      } else return 0;
    } catch (ex) {
      console.log(`[E] ]  ${cacheKey}  Error: ${ex}`);
      return 0;
    }
  }

  //GetPR4Repo
  async getPR4Repo(org: string, repo: string, bustTheCache = false) {
    await this.createPool();
    const cacheKey = 'GetPR4Repo -' + org + repo;
    try {
      if (bustTheCache) {
        this.myCache.del(cacheKey);
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
    } catch (ex) {
      console.log(`[E]  ${cacheKey}  Error: ${ex}`);
      return 0;
    }
  }

  //saveOrgChart
  async saveOrgChart(userId: string, org: string, orgChart: string) {
    try {
      await this.createPool();
      const request = await this.pool.request();
      request.input('org', sql.VarChar(this.ORG_LEN), org);
      request.input('userId', sql.VarChar(this.LOGIN_LEN), userId);
      request.input('orgChart', sql.VarChar, orgChart);
      const recordSet = await request.execute('SaveOrgChart');
      if (recordSet.recordset.length > 0) {
        return recordSet.recordset;
        //Org Chart is updated lets drop the cache
        const cacheKey = 'getOrgTree' + org + userId;
        let v =  this.myCache.get (cacheKey);
        if (v)
          this.myCache.del (cacheKey);
      } else {
        return 0;
      }
    } catch (ex) {
      console.log(`[E]  SaveOrgChart:  Error: ${ex}`);
      return 0;
    }
  }

  //saveOrgChart
  async getOrgChart(org: string, bustTheCache: boolean = false) {
    await this.createPool();
    const cacheKey = 'getOrgChart -' + org;
    try {
      if (bustTheCache) {
        this.myCache.del(cacheKey);
      } else {
        const val = this.myCache.get(cacheKey);
        if (val) {
          return val;
        }
      }
      const request = await this.pool.request();
      request.input('org', sql.VarChar(this.ORG_LEN), org);
      const recordSet = await request.execute('getOrgChart');
      if (recordSet.recordset.length > 0) {
        this.myCache.set(cacheKey, recordSet.recordset);
        return recordSet.recordset;
      } else {
        return 0;
      }
    } catch (ex) {
      console.log(`[E]  ${cacheKey}  Error: ${ex}`);
      return 0;
    }
  }

  async getToken4User(id: number) {
    const cacheKey = 'getUser -' + id; //cacheKey is getUser because i am reading there cache value. This is different from norm
    const val = this.myCache.get(cacheKey);
    if (val) {
      // return this.decrypt(val.recordset[0].Auth_Token, id.toString());
      return val.recordset[0].Auth_Token;
    }
    const recordSet = await this.getUser(id);
    if (recordSet) {
      //return this.decrypt(recordSet[0].Auth_Token, id.toString());
      return recordSet[0].Auth_Token;
    } else return;
  }

  async getJiraToken(id: string) {
    const recordSet = await this.getJiraTenant(id);
    if (recordSet) return recordSet[0].Auth_Token;
    else return;
  }

  async getTopDev4LastXDays(org: string, day = 1) {
    const cacheKey = 'getTopDev4LastXDays' + org + day;
    try {
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
    } catch (ex) {
      console.log(`[E]  ${cacheKey}  Error: ${ex}`);
      return;
    }
  }

  //No one calls this
  async getGitDev4Org(org: string) {
    const cacheKey = 'getGitDev4Org' + org;
    try {
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
      const recordSet = await request.execute('GitDev4Org');
      if (recordSet.recordset) {
        this.myCache.set(cacheKey, recordSet.recordset);
        return recordSet.recordset;
      } else {
        return;
      }
    } catch (ex) {
      console.log(`[E]  ${cacheKey}  Error: ${ex}`);
      return;
    }
  }

  async GetUser4Org(org: string) {
    const cacheKey = 'getGitDev4Org' + org;
    try {
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
      const recordSet = await request.execute('GetUser4Org');
      if (recordSet.recordset) {
        this.myCache.set(cacheKey, recordSet.recordset);
        return recordSet.recordset;
      } else {
        return;
      }
    } catch (ex) {
      console.log(`[E]  ${cacheKey}  Error: ${ex}`);
      return;
    }
  }

  async getWatcher(org: string, gitOrg: string) {
    const cacheKey = 'GetWatcher' + org;
    try {
      const val = this.myCache.get(cacheKey);
      if (val) {
        return val;
      }
      await this.createPool();
      const request = await this.pool.request();
      if (!org || !gitOrg) {
        throw new Error('org or GitOrg cannot be null');
      }
      request.input('Org', sql.VarChar(this.ORG_LEN), org);
      request.input('GitOrg', sql.VarChar(this.ORG_LEN), gitOrg);
      const recordSet = await request.execute('GetWatcher');
      if (recordSet.recordset) {
        this.myCache.set(cacheKey, recordSet.recordset);
        return recordSet.recordset;
      } else {
        return;
      }
    } catch (ex) {
      console.log(`[E]  ${cacheKey}  Error: ${ex}`);
      return;
    }
  }

  async getKudos(org: string, gitOrg: string) {
    const cacheKey = 'getKudos' + org + gitOrg;
    try {
      const val = this.myCache.get(cacheKey);
      if (val) {
        return val;
      }
      await this.createPool();
      const request = await this.pool.request();
      if (!org || !gitOrg) {
        throw new Error('org or GitOrg cannot be null');
      }
      request.input('Org', sql.VarChar(this.ORG_LEN), org);
      request.input('GitOrg', sql.VarChar(this.ORG_LEN), gitOrg);
      const recordSet = await request.execute('GetKudos');
      if (recordSet.recordset) {
        this.myCache.set(cacheKey, recordSet.recordset);
        return recordSet.recordset;
      } else {
        return;
      }
    } catch (ex) {
      console.log(`[E]  ${cacheKey}  Error: ${ex}`);
      return;
    }
  }

  async getKudos4User(target: string) {
    const cacheKey = 'getKudos4User' + target;
    try {
      const val = this.myCache.get(cacheKey);
      if (val) {
        return val;
      }
      await this.createPool();
      const request = await this.pool.request();
      request.input('Target', sql.VarChar(this.ORG_LEN), target);
      const recordSet = await request.execute('GetKudos4User');
      if (recordSet.recordset) {
        this.myCache.set(cacheKey, recordSet.recordset);
        return recordSet.recordset;
      } else {
        return;
      }
    } catch (ex) {
      console.log(`[E]  ${cacheKey}  Error: ${ex}`);
      return;
    }
  }

  async GetRepoParticipation4Login(org: string, login: string, days: number = 30, bustTheCache: boolean = false) {
    const cacheKey = `GetRepoParticipation4Login: org: ${login} ${org} ${days}`;
    try {
      if (bustTheCache) {
        this.myCache.del(cacheKey);
      } else {
        const val = this.myCache.get(cacheKey);
        if (val) {
          return val;
        }
      }

      await this.createPool();
      const request = await this.pool.request();
      if (!org) {
        throw new Error('org cannot be null');
      }
      request.input('org', sql.VarChar(this.ORG_LEN), org);
      request.input('login', sql.VarChar(this.LOGIN_LEN), login);
      request.input('days', sql.Int, days);

      const recordSet = await request.execute('GetRepoParticipation4Login');

      if (recordSet.recordset) {
        this.myCache.set(cacheKey, recordSet.recordset);
        return recordSet.recordset;
      }
      return recordSet;
    } catch (ex) {
      console.log(`[E]  ${cacheKey}  Error: ${ex}`);
      return null;
    }
  }

  async getPR4Id(org: string, id = 1) {
    const cacheKey = `getPR4Id: org:  ${org} id ${id}`;
    try {
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
      request.input('Id', sql.Int, id);
      const recordSet = await request.execute('GetPR4Id');
      if (recordSet.recordset) {
        this.myCache.set(cacheKey, recordSet.recordset);
        return recordSet.recordset;
      }
      return recordSet;
    } catch (ex) {
      console.log(`[E]  ${cacheKey}  Error: ${ex}`);
      return null;
    }
  }

  async getPRCount4LastXDays(org: string, login: string, day = 1) {
    await this.createPool();
    const cacheKey = 'PRCount4LastXDays' + org + login + day.toString();
    try {
      const val = this.myCache.get(cacheKey);
      if (val) {
        return val;
      }

      const request = await this.pool.request();
      if (!org) {
        throw new Error('org cannot be null');
      }
      request.input('Org', sql.VarChar(this.ORG_LEN), org);
      request.input('Login', sql.VarChar(this.LOGIN_LEN), login);
      request.input('Day', sql.Int, day);
      const recordSet = await request.execute('PRCount4LastXDays');
      if (recordSet.recordset.length > 0) {
        this.myCache.set(cacheKey, recordSet.recordset);
      }
      return recordSet.recordset;
    } catch (ex) {
      console.log(`[E]  ${cacheKey}  Error: ${ex}`);
      return null;
    }
  }

  //Going to ignore org
  async getPR4Dev(org: string, day = 1, login: string, action: string, pageSize: number) {
    if (!org) {
      console.log(`[i] Exiting getPRDev org cannot be null`);
      return;
    }
    if (isNullOrUndefined(login) || login === '') {
      login = 'null';
    }
    const cacheKey = 'getPR4Dev' + org + day.toString() + login + action;
    try {
      const val = this.myCache.get(cacheKey);
      if (val) {
        return val;
      }
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
    } catch (ex) {
      console.log(`[E]  ${cacheKey}  Error: ${ex}`);
      return null;
    }
  }

  async getClientSecret(tenant: string) {
    const cacheKey = 'getClientSecret' + tenant;
    try {
      const val = this.myCache.get(cacheKey);
      if (val) {
        return val;
      }
      await this.createPool();
      const request = await this.pool.request();
      if (!tenant) {
        throw new Error('tenant cannot be null');
      }
      request.input('tenant', sql.VarChar(this.ORG_LEN), tenant);
      const recordSet = await request.execute('GetClientSecret');
      if (recordSet.recordset.length > 0) {
        this.myCache.set(cacheKey, recordSet.recordset[0].Secrets);
      }
      return recordSet.recordset[0].Secrets;
    } catch (ex) {
      console.log(`[E]  ${cacheKey}  Error: ${ex}`);
      return null;
    }
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
    try {
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
    } catch (ex) {
      console.log(`[E]  ${cacheKey}  Error: ${ex}`);
      return null;
    }
  }

  async getPR4LastXDays(org: string, day = 1) {
    const cacheKey = 'getPR4LastXDays' + org + day.toString();
    try {
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
    } catch (ex) {
      console.log(`[E]  ${cacheKey}  Error: ${ex}`);
      return null;
    }
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
      console.log(`[E]  ${err}`);
    }
  }

  async saveJiraUser(user: JiraUser) {
    try {
      await this.createPool();
      const request = await this.pool.request();
      if (!user.Photo) {
        user.Photo = '';
      }
      if (!user.DisplayName) {
        user.DisplayName = '';
      }
      //Token is kept decrypted in DB
      const token = user.AuthToken; //No Encryption for Jira
      request.input('Id', sql.Char, user.Id);
      request.input('email', sql.VarChar(200), user.Email);
      request.input('UserName', sql.VarChar(200), user.UserName);
      request.input('DisplayName', sql.VarChar(200), user.DisplayName);
      request.input('ProfileUrl', sql.Char(500), user.ProfileUrl);
      request.input('AuthToken', sql.VARCHAR(4000), token);
      request.input('RefreshToken', sql.VARCHAR(4000), user.RefreshToken);
      request.input('Photo', sql.Char(500), user.Photo);
      request.input('AccessibleResources', sql.Char(8000), JSON.stringify(user.AccessibleResources));
      const recordSet = await request.execute('SaveJiraTenant');
      return recordSet.rowsAffected[0];
    } catch (ex) {
      console.log(`[E]  ${ex}`);
      return 0;
    }
  }

  async saveMSR(srId: number, userId: string, org: string, statusDetails: string, reviewer: string, status: number, links: string, manager: string, managerComment: string, managerStatus: number) {
    try {
      const request = await this.pool.request();
      request.input('SRId', sql.Int, srId);
      request.input('UserId', sql.VarChar(100), userId);
      request.input('Org', sql.VarChar(200), org);
      request.input('StatusDetails', sql.VarChar(10000), statusDetails);
      request.input('Reviewer', sql.VarChar(500), reviewer);
      request.input('Status', sql.Int, status);
      request.input('Links', sql.VarChar(1000), links);

      request.input('Manager', sql.VarChar(1000), manager);
      request.input('ManagerComment', sql.VarChar(4000), managerComment);
      request.input('ManagerStatus', sql.Int, managerStatus);
      const recordSet = await request.execute('SaveMSR');
      return recordSet.rowsAffected[0];
    } catch (ex) {
      console.log(`[E] saveMSR  Error: ${ex}`);
      return 0;
    }
  }

  async setWatcher(watcher: string, target: string, org: string, gitOrg: string) {
    try {
      const request = await this.pool.request();
      request.input('watcher', sql.VarChar(200), watcher);
      request.input('target', sql.VarChar(200), target);
      request.input('Org', sql.VarChar(200), org);
      request.input('gitOrg', sql.VarChar(200), gitOrg);

      const recordSet = await request.execute('SetWatcher');
      return recordSet.rowsAffected[0];
    } catch (ex) {
      console.log(`[E]  setWatcher  Error: ${ex}`);
      return 0;
    }
  }

  async setKudos(sender: string, target: string, org: string, gitOrg: string, kudos: string) {
    try {
      const request = await this.pool.request();
      request.input('sender', sql.VarChar(200), sender);
      request.input('target', sql.VarChar(200), target);
      request.input('Org', sql.VarChar(200), org);
      request.input('gitOrg', sql.VarChar(200), gitOrg);
      request.input('kudos', sql.VarChar(5000), kudos);

      const recordSet = await request.execute('setKudos');
      return recordSet.rowsAffected[0];
    } catch (ex) {
      console.log(`[E] setKudos  Error: ${ex}`);
      return 0;
    }
  }

  async getSR4Id(srId: number, bustTheCache: boolean) {
    const cacheKey = 'getMSR4Id' + srId;
    try {
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
      console.log(`[E]  ${cacheKey}  Error: ${ex}`);
      return null;
    }
  }

  async getSR4User(userId: string, bustTheCache: boolean) {
    const cacheKey = 'getSR4User' + userId;
    try {
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
      console.log(`[E]  ${cacheKey}  Error: ${ex}`);
      return null;
    }
  }

  async GetSR4User4Review(userId: string, status: number, userFilter: string = null, dateFilter: string = null, bustTheCache: boolean) {
    const cacheKey = 'GetSR4User4Review' + userId + status;
    try {
      userFilter = userFilter.trim();
      dateFilter = dateFilter.trim();
      const request = await this.pool.request();
      request.input('UserId', sql.VarChar(100), userId);
      request.input('Status', sql.Int, status);
      request.input('UserFilter', sql.VarChar, userFilter != 'null' ? userFilter : null);
      request.input('DateFilter', sql.VarChar(50), dateFilter != 'null' ? dateFilter : null);

      const recordSet = await request.execute('GetSR4User4Review');
      if (recordSet) {
        this.myCache.set(cacheKey, recordSet.recordset);
      }
      return recordSet.recordset;
    } catch (ex) {
      console.log(`[E]  ${cacheKey}  Error: ${ex}`);
      return null;
    }
  }

  /* save */
  async saveLoggedInUser(user: GUser) {
    try {
      await this.createPool();
      const request = await this.pool.request();
      if (!user.Photo) {
        user.Photo = '';
      }
      if (!user.DisplayName) {
        user.DisplayName = '';
      }

      // const token = this.encrypt(user.AuthToken, user.Id.toString());
      request.input('Id', sql.Int, user.Id);
      request.input('email', sql.VarChar(200), user.Email);
      request.input('UserName', sql.VarChar(200), user.UserName);
      request.input('DisplayName', sql.VarChar(200), user.DisplayName);
      request.input('ProfileUrl', sql.VarChar(1000), user.ProfileUrl);
      request.input('AuthToken', sql.VarChar(4000), user.AuthToken);
      request.input('RefreshToken', sql.VarChar(4000), user.RefreshToken);
      request.input('Photo', sql.VarChar(1000), user.Photo);
      const recordSet = await request.execute('SaveTenant');
      return recordSet.rowsAffected[0];
    } catch (ex) {
      console.log(`[E]  saveLoggedInUSer ${user} ${ex}`);
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
        console.log(`[i] No PR found for org: ${org} Repo: ${repo}`);
      }
      if (nodes.length === 0) {
        console.log(`[i] No PR found for org: ${org} Repo: ${repo}`);
      }

      if (nodes.length > 0) {
        console.log(`[i] ${nodes.length} PR found for org: ${org} Repo: ${repo}`);
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
          console.log(`[E]  Error! While saving PR for org:${org} repo: ${repo} - ${ex}`);
        }
      }
    } catch (ex) {
      console.log(`[E]  savePR4Repo ${org} ${repo}`);
      return false;
    }
    return true;
  }

  /* return number of orgs */
  async saveUserOrg(userId: string, org: string, orgType: string = 'git') {
    try {
      await this.createPool();
      const request = await this.pool.request();
      request.input('UserId', sql.Int, Number(userId));
      request.input('Org', sql.VarChar(this.ORG_LEN), org.trim());
      request.input('DisplayName', sql.VarChar(this.ORG_LEN), org.trim());
      request.input('OrgType', sql.VarChar(5), orgType.trim());
      await request.execute('SaveUserOrg');
      return org.length;
    } catch (ex) {
      console.log(`[E]  saveUserOrg: ${userId} ${org} ${ex}`);
      return 0;
    }
  }

  async saveOrgs(userId: string, orgs: string[]) {
    try {
      await this.createPool();
      const request = await this.pool.request();
      for (const o of orgs) {
        const org: any = o;
        request.input('UserId', sql.Int, Number(userId));
        if (org.url) {
          request.input('Org', sql.VarChar(this.ORG_LEN), org.url.substr('https://github.com/'.length));
          request.input('DisplayName', sql.VarChar(this.ORG_LEN), org.name);
        } else {
          request.input('Org', sql.VarChar(this.ORG_LEN), org);
          request.input('DisplayName', sql.VarChar(this.ORG_LEN), org);
        }

        await request.execute('SaveUserOrg');
      }
      return orgs.length;
    } catch (ex) {
      console.log(`[E]  saveOrgs: ${userId} ${orgs} ${ex}`);
      return 0;
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
        request.input('TenantId', sql.Char, tenantId);
        request.input('Org', sql.VarChar(this.ORG_LEN), org); //
        request.input('accountId', sql.VarChar(100), dev.accountId); //rsarosh@hotmail.com
        request.input('displayName', sql.VarChar(200), dev.displayName); //Rafat Sarosh
        request.input('avatarUrls', sql.Text, JSON.stringify(dev.avatarUrls)); //rsarosh
        request.input('self', sql.VarChar(500), dev.self);
        await request.execute('SaveJiraUsers');
      }
    } catch (ex) {
      console.log(`[E]  saveJiraUsers: ${tenantId} ${org} ${ex}`);
      return ex;
    }
  }

  async saveDevs(org: string, devs: string[]) {
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
      console.log(`[E]  saveDevs:  ${org} ${ex}`);
      return 0;
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
      console.log(`[E]  saveRepo: ${tenantId} ${org} ${ex}`);
      return 0;
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
      console.log(`[E]  shredObject ${err}`);
    }

    return pr;
  }

  //UserRole
  async getUserRole(loginId: string, org: string, bustTheCache: boolean) {
    const cacheKey = 'getUserRole' + loginId + org;
    try {
      if (!bustTheCache) {
        const val = this.myCache.get(cacheKey);
        if (val) {
          return val;
        }
      }
      const request = await this.pool.request();
      request.input('login', sql.VarChar(100), loginId);
      request.input('org', sql.VarChar(200), org);
      const recordSet = await request.execute('getUserRole');
      if (recordSet) {
        this.myCache.set(cacheKey, recordSet.recordset);
      }
      return recordSet.recordset;
    } catch (ex) {
      console.log(`[E]  ${cacheKey} ${ex}`);
      return ex;
    }
  }

  async getRole4Org(org: string, bustTheCache: boolean) {
    const cacheKey = 'getRole4Org' + org;
    try {
      if (!bustTheCache) {
        const val = this.myCache.get(cacheKey);
        if (val) {
          return val;
        }
      }
      const request = await this.pool.request();
      request.input('org', sql.VarChar(200), org);
      const recordSet = await request.execute('getRole4Org');
      if (recordSet) {
        this.myCache.set(cacheKey, recordSet.recordset);
      }
      return recordSet.recordset;
    } catch (ex) {
      console.log(`[E]  ${cacheKey} ${ex}`);
      return ex;
    }
  }

  async isUserAdmin(loginId: string, org: string, bustTheCache: boolean) {
    const cacheKey = 'isUserAdmin' + loginId + org;
    try {
      if (!bustTheCache) {
        const val = this.myCache.get(cacheKey);
        if (val) {
          return val;
        }
      }
      const request = await this.pool.request();
      request.input('login', sql.VarChar(100), loginId);
      request.input('org', sql.VarChar(200), org);
      const recordSet = await request.execute('IsAdmin');
      if (recordSet) {
        this.myCache.set(cacheKey, recordSet.returnValue); //1 is true and zero is false
      }
      return recordSet.returnValue;
    } catch (ex) {
      console.log(`[E]  ${cacheKey} ${ex}`);
      return ex;
    }
  }

  async isUserMSRAdmin(loginId: string, org: string, bustTheCache: boolean) {
    const cacheKey = 'isUserMSRAdmin' + loginId + org;
    try {
      if (!bustTheCache) {
        const val = this.myCache.get(cacheKey);
        if (val) {
          return val;
        }
      }
      const request = await this.pool.request();
      request.input('login', sql.VarChar(100), loginId);
      request.input('org', sql.VarChar(200), org);
      const recordSet = await request.execute('IsMSRAdmin');
      if (recordSet) {
        this.myCache.set(cacheKey, recordSet.recordset);
      }
      return recordSet.recordset;
    } catch (ex) {
      console.log(`[E]  ${cacheKey} ${ex}`);
      return ex;
    }
  }

  async saveUserRole(login: string, org: string, role: string) {
    try {
      if (!role) {
        console.log(`saveUserRole [E]  role cannot be null`);
        return;
      }
      if (!login) {
        console.log(`saveUserRole [E]  login cannot be null`);
        return;
      }
      if (!org) {
        console.log(`saveUserRole [E]  org cannot be null`);
        return;
      }

      await this.createPool();

      const request = await this.pool.request();
      request.input('login', sql.VarChar(this.LOGIN_LEN), login);
      request.input('Org', sql.VarChar(this.ORG_LEN), org);
      request.input('role', sql.VarChar(100), role);
      const recordSet = await request.execute('SaveUserRole');
      return recordSet.rowsAffected[0];
    } catch (ex) {
      console.log(`[E]  saveUserRole: ${login} ${org} ${ex}`);
      return ex;
    }
  }

  async deleteUserRole(login: string, org: string, role: string) {
    try {
      if (!role) {
        console.log(`saveUserRole [E]  role cannot be null`);
        return;
      }
      if (!login) {
        console.log(`saveUserRole [E]  login cannot be null`);
        return;
      }
      if (!org) {
        console.log(`saveUserRole [E]  org cannot be null`);
        return;
      }

      await this.createPool();

      const request = await this.pool.request();
      request.input('login', sql.VarChar(this.LOGIN_LEN), login);
      request.input('Org', sql.VarChar(this.ORG_LEN), org);
      request.input('Role', sql.VarChar(100), role);
      const recordSet = await request.execute('DeleteUserRole');
      return recordSet.rowsAffected[0];
    } catch (ex) {
      console.log(`[E]  deleteUserRole: ${login} ${org} ${ex}`);
      return ex;
    }
  }

  async getOrgTree(currentOrg: string, userId: string, bustTheCache: boolean) {
    const cacheKey = 'getOrgTree' + currentOrg + userId;
    if (!bustTheCache) {
      const val = this.myCache.get(cacheKey);
      if (val) {
        return val;
      }
    }
    /*
    { key: 1, name: "Eng Management" }
    { key: 2, name: "Rafat Sarosh", userid: 'rsarosh' , parent: 1 }
  */
    let _nodes: Map<number, Node> = new Map<number, Node>();
    let _obj: {nodeDataArray: any[]};
    return new Promise((done, fail) => {
      try {
        this.getOrgChart(currentOrg, true).then(v => {
          if (!v[0]) {
            fail(`No Data for ${currentOrg}`); //  this.router.navigate(['/orgChart']);
          }
          _obj = JSON.parse(v[0].OrgChart);
          _obj.nodeDataArray.forEach(x => {
            if (x.key === 1) {
              let _n = new Node();
              _n.parent = x;
              _nodes.set(x.key, _n);
              return;
            }

            if (x.parent) {
              let n = _nodes.get(x.parent);
              if (!n) {
                //parent not found, make a new node
                let _n = new Node();
                _n.parent = getElementfromNodeDataArray(x.parent);
                _n.child.push(x);
                _nodes.set(x.parent, _n);
              } else {
                //parent found, let set the child
                n.child.push(x);
              }
            }
          });
          let Data: TNode[] = [];
          _nodes.forEach(x => {
            let data = new TNode();
            data.label = x.parent.name;
            data.data = x.parent.userid;
            data.expandedIcon = 'pi';
            data.collapsedIcon = 'pi';
            for (let y of x.child) {
              let c = new TNode();
              c.label = y.name;
              c.data = y.userid;
              c.expandedIcon = 'pi ';
              c.collapsedIcon = 'pi ';
              data.children.push(c);
            }
            Data.push(data);
          });

          for (let z of Data) {
            if (z.children) {
              let cCtr = 0;
              for (let c of z.children) {
                let n = IsChildrenExistAsNode(c.label);
                if (n) {
                  z.children[cCtr] = n;
                }
                cCtr = cCtr + 1;
              }
            }
          }
          /*
          0: TNode
            children: Array(3)
              0: TNode
                  children: (5) [TNode, TNode, TNode, TNode, TNode]
              collapsedIcon: "pi"
              data: "rafat.sarosh@axleinfo.com"
              expandedIcon: "pi"
              label: "Rafat Sarosh"
              __proto__: Object
        1: TNode {children: Array(1), label: "Nathan Hotaling", data: "Nathan.Hotaling@labshare.org", expandedIcon: "pi", collapsedIcon: "pi"}
        2: TNode {children: Array(3), label: "Reid Simon", data: "reid.simon@axleinfo.com", expandedIcon: "pi", collapsedIcon: "pi"}
        */
          this.myCache.set(cacheKey, Data);
          done(Data);

          function IsChildrenExistAsNode(lbl: string): TNode {
            for (let n of Data) {
              if (n.label === lbl) {
                Data = Data.filter(obj => obj !== n);
                return n;
              }
            }
          }

          function getElementfromNodeDataArray(key: number) {
            for (let o of _obj.nodeDataArray) {
              if (o.key === key) return o;
            }
            return null;
          }
        });
      } catch (ex) {
        fail(ex);
      }
    }); //Promise
  }

  //Is Y in tree of X -> Is X Manager of Y?
  async IsXYAllowed(currentOrg: string, userId: string, X: string, Y: string) {
    let tree = await this.getOrgTree(currentOrg, userId, false);
    let parentNode = this.GetNode4User(X, tree[0].children);
    if (parentNode) {
      return this.SearchAllNodes(Y, parentNode.children);
    }
    return false;
  }

  SearchAllNodes(user: string, tree: any) {
    for (const c of tree) {
      if (c.data === user) {
        return true;
      }
      if (c.children) {
        if (this.SearchAllNodes(user, c.children)) return true;
      }
    }
    return false;
  }

  GetNode4User(user: string, tree: any): any {
    for (const c of tree) {
      if (c.data === user) {
        return c;
      }
      if (c.children) {
        let node = this.GetNode4User(user, c.children);
        if (node) return node;
      }
    }
    return null;
  }
}

export {SQLRepository, GUser, JiraUser, ErrorObj};
