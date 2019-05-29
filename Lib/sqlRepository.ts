let sql = require('mssql');
import * as _ from 'lodash';
import {isNullOrUndefined} from 'util';
import {EMLINK} from 'constants';
const NodeCache = require('node-cache');

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

class SQLRepository {
  pr: PullRequest;
  raw: string;
  pool: any;
  myCache: any;
  sqlConfigSetting: any = {};

  constructor(obj: any) {
    //for get calls there may not be any obj
    if (obj) {
      this.pr = this.shredObject(obj);
      this.raw = obj.body;
    }

    if (!this.myCache) {
      this.myCache = new NodeCache({stdTTL: 300, checkperiod: 120});
    }

    this.createPool();
  }





  async createPool() {
    if (!this.pool) {
      this.sqlConfigSetting.server = process.env.SQL_Server; 
      this.sqlConfigSetting.database = process.env.SQL_Database ;
      this.sqlConfigSetting.user = process.env.SQL_User;
      this.sqlConfigSetting.password = process.env.SQL_Password;
      this.sqlConfigSetting.port = 1433;
      this.sqlConfigSetting.encrypt = true;

      await new sql.ConnectionPool(this.sqlConfigSetting).connect().then((pool: any) => {
        this.pool = pool;
      });
    }
  }

  //return 0 if not a valid tenant or the token more than 7 days old
  async CheckToken(tenantId: number) {
    try {
      let cacheKey = 'CheckToken' + tenantId ;
      let val = this.myCache.get(cacheKey);
      if (val) {
        return val;
      }
      await this.createPool();
      const request = await this.pool.request();
      request.input('Id', sql.Int, tenantId);
      const recordSet = await request.execute('CheckTenant');
      this.myCache.set (cacheKey, recordSet.recordset[0].Result === 1);
      return recordSet.recordset[0].Result === 1;
    } catch (ex) {
      console.log(ex);
      return false;
    }
  }

  async GetRepositoryPR(org: string, repo: string, day: string, pageSize: string) {
    try {
      let cacheKey = 'GetRepositoryPR' + org+repo+day ;
      let val = this.myCache.get(cacheKey);
      if (val) {
        return val;
      }
      await this.createPool();
      const request = await this.pool.request();
      request.input('repo', sql.VarChar(100), repo);
      request.input('org', sql.VarChar(100), org);
      request.input('day', sql.Int, day);
      request.input('PageSize', sql.Int, pageSize);
      const recordSet = await request.execute('GetRepositoryPR');
      this.myCache.set (cacheKey, recordSet.recordset);
      return recordSet.recordset;
    } catch (ex) {
      console.log(ex);
      return false;
    }
  }

  async GetAllRepoCollection4TenantOrg(tenantId: string, org: string, bustTheCache: Boolean = false) {
    await this.createPool();
    const request = await this.pool.request();
    request.input('TenantId', sql.VarChar(200), tenantId);
    request.input('Org', sql.VarChar(200), org);
    const recordSet = await request.execute('[GetAllRepoCollection4TenantOrg]');
    return recordSet;
  }

  async GetRepoCollectionByName(repoCollectionName: string, bustTheCache: Boolean = false) {
    await this.createPool();
    const request = await this.pool.request();
    request.input('CollectionName', sql.VarChar(200), repoCollectionName);
    const recordSet = await request.execute('GetRepoCollectionByName');
    return recordSet.recordset;
  }

  async SaveRepo(email: string, org: string, repos: string[]) {
    try {
      if (repos == undefined)
        return;
      if (repos.length === 0 ){
        console.log('No repo to be saved!')
        return;  
      }
      await this.createPool();
      const request = await this.pool.request();
      let repoDetails: string;
      for (let i = 0; i < repos.length; i++) {
        let repo: any = repos[i];
        let createdAt = String(repo.createdAt).substr(0, 10);
        console.log(`SaveRepo = org: ${org} repo: ${repo.name}`);
        request.input('TenantId', sql.VarChar(200), email);
        request.input('Organization', sql.VarChar(200), org);
        request.input('Id', sql.VarChar(200), repo.id);
        request.input('name', sql.VarChar(200), repo.name);
        request.input('desc', sql.VarChar(200), repo.description);
        request.input('HomePage', sql.VarChar(200), repo.homepageUrl);
        request.input('CreatedAt', sql.VarChar(10), createdAt);
        const recordSet = await request.execute('SetRepos');
      }
    } catch (ex) {
      return ex;
    }
  }

  async GetRepo(tenantId: string, org: string, bustTheCache: Boolean = false) {
    let cacheKey = 'GetRepo' + tenantId + org;

    if (bustTheCache) {
      this.myCache.del(cacheKey);
    }

    let val = this.myCache.get(cacheKey);

    if (val) {
      return val;
    }

    await this.createPool();
    const request = await this.pool.request();
    request.input('TenantId', sql.VarChar(200), tenantId);
    request.input('Organization', sql.VarChar(200), org);

    const recordSet = await request.execute('GetRepos');
    if (recordSet) {
      this.myCache.set(cacheKey, recordSet.recordset);
    }
    return recordSet.recordset;
  }

  async SaveOrg(email: string, orgs: string[]) {
    try {
      await this.createPool();
      const request = await this.pool.request();
      for (let i = 0; i < orgs.length; i++) {
        let org: any = orgs[i];
        request.input('TenantId', sql.VarChar(200), email);
        request.input('Org', sql.VarChar(1000), org.name);
        const recordSet = await request.execute('SetOrg');
      }
    } catch (ex) {
      return ex;
    }
  }

  async GetOrg(email: string, bustTheCache: Boolean = false) {
    let cacheKey = 'GetOrg' + email;

    if (bustTheCache) {
      this.myCache.del(cacheKey);
    }

    let val = this.myCache.get(cacheKey);

    if (val) {
      return val;
    }

    await this.createPool();
    const request = await this.pool.request();
    request.input('TenantId', sql.VarChar(200), email);
    const recordSet = await request.execute('GetOrg');
    if (recordSet.recordset) {
      this.myCache.set(cacheKey, recordSet.recordset);
    }
    return recordSet.recordset;
  }

  //Token will return UserName, DisplayName, ProfileURL, AuthToken, LastUpdated and Photo (URL)

  async GetTenant(id: number) {
    let cacheKey = 'GetTenant-' + id;
    let val = this.myCache.get(cacheKey);
    if (val) {
      return val;
    }
    await this.createPool();
    const request = await this.pool.request();
    request.input('Id', sql.Int, id);
    const recordSet = await request.execute('GetTenant');
    if (recordSet.recordset.length > 0) {
      this.myCache.set(cacheKey, recordSet.recordset);
      return recordSet.recordset;
    } else return;
  }

  //GetPR
  async GetPR4Repo(org: string, repo: string, bustTheCache: boolean = false) {
    await this.createPool();
    let cacheKey = 'GetPR4Repo -' + org + repo;
    let val = this.myCache.get(cacheKey);
    if (val) {
      return val;
    }
    const request = await this.pool.request();

    request.input('org', sql.VarChar(1000), org);
    request.input('repo', sql.VarChar(1000), repo);

    const recordSet = await request.execute('GetPR4Repo');
    if (recordSet.recordset.length > 0) {
      this.myCache.set(cacheKey, recordSet.recordset);
      return recordSet.recordset;
    } else {
      return;
    }
  }

  
  async GetToken(id: number) {
    let cacheKey = 'GetTenant -' + id;
    let val = this.myCache.get(cacheKey);
    if (val) {
      return val.recordset[0].Auth_Token;
    }
    const recordSet = await this.GetTenant(id);
    if (recordSet) return recordSet[0].Auth_Token;
    else return;
  }

  async TopDevForLastXDays(org: string, day: number = 1) {
    await this.createPool();
    const request = await this.pool.request();
    if (!org) {
      throw new Error('tenant cannot be null');
    }
    request.input('Org', sql.VarChar(100), org);
    request.input('Day', sql.Int, day);
    const recordSet = await request.execute('TopDevForLastXDays');
    return recordSet.recordset;
  }
  async GetPullRequestForId(tenant: string, id: number = 1) {
    await this.createPool();
    const request = await this.pool.request();
    if (!tenant) {
      throw new Error('tenant cannot be null');
    }
    request.input('Org', sql.VarChar(100), tenant);
    request.input('Id', sql.Int, id);
    const recordSet = await request.execute('GetPullRequestforId');
    return recordSet.recordset;
  }

  async PullRequestCountForLastXDays(org: string, day: number = 1) {
    await this.createPool();
    let cacheKey = 'PullRequestCountForLastXDays' + org + day.toString();
    let val = this.myCache.get(cacheKey);
    if (val) {
      return val;
    }

    const request = await this.pool.request();
    if (!org) {
      throw new Error('tenant cannot be null');
    }
    request.input('Org', sql.VarChar(100), org);
    request.input('Day', sql.Int, day);
    const recordSet = await request.execute('PullRequestCountForLastXDays');
    if (recordSet.recordset.length > 0) {
      this.myCache.set(cacheKey, recordSet.recordset);
    }
    return recordSet.recordset;
  }

  async PullRequest4Dev(org: string, day: number = 1, login: string, action: string, pageSize: number) {
    let cacheKey = 'PullRequest4Dev' + org + day.toString() + login;
    let val = this.myCache.get(cacheKey);
    if (val) {
      return val;
    }
    await this.createPool();
    const request = await this.pool.request();
    if (!org) {
      throw new Error('tenant cannot be null');
    }
    if (pageSize === 0) pageSize = 10;

    request.input('Org', sql.VarChar(100), org);

    if (isNullOrUndefined(login) || login === '') {
      request.input('Login', sql.VarChar(200), 'null');
    } else {
      request.input('Login', sql.VarChar(200), login);
    }
    if (isNullOrUndefined(action) || action === '') {
      request.input('Action', sql.VarChar(50), 'null');
    } else {
      request.input('Action', sql.VarChar(50), action);
    }

    request.input('Day', sql.Int, day);
    request.input('pageSize', sql.Int, pageSize);
    const recordSet = await request.execute('PullRequest4Devs');
    if (recordSet.recordset.length > 0) {
      this.myCache.set(cacheKey, recordSet.recordset);
    }
    return recordSet.recordset;
  }

  async LongestPullRequest(tenant: string, day: number = 1) {
    await this.createPool();
    const request = await this.pool.request();
    if (!tenant) {
      throw new Error('tenant cannot be null');
    }
    request.input('Org', sql.VarChar(100), tenant);
    request.input('Day', sql.Int, day);
    const recordSet = await request.execute('LongestPullRequest');
    return recordSet;
  }

  async GetTopRespositories4XDays(org: string, day: number = 1) {
    await this.createPool();
    const request = await this.pool.request();
    if (!org) {
      throw new Error('tenant cannot be null');
    }
    request.input('Org', sql.VarChar(100), org);
    request.input('Day', sql.Int, day);
    const recordSet = await request.execute('GetTopRespositories4XDays');
    return recordSet.recordset;
  }

  async PullRequestForLastXDays(tenant: string, day: number = 1) {
    await this.createPool();
    const request = await this.pool.request();
    if (!tenant) {
      throw new Error('tenant cannot be null');
    }
    request.input('Org', sql.VarChar(100), tenant);
    request.input('Day', sql.Int, day);
    const recordSet = await request.execute('PullRequestForLastXDays');
    return recordSet.recordset;
  }

  async getItem(query: string, page: number, pageSize: number) {
    try {
      await this.createPool();
      const request = await this.pool.request();
      const rs = await request.query(query);
      let results = rs.recordset;
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

      let s: string = '[';
      let ctr: number = 0;
      let startCtr: number = (page - 1) * pageSize;
      if (startCtr === 0) {
        startCtr = 1;
      }
      let endCtr: number = page * pageSize;

      if (endCtr > results.length) {
        endCtr = results.length;
      }

      for (let result of results) {
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
  async saveTenant(tenant: Tenant) {
    try {
      console.log('==> inside saveTenant');
      await this.createPool();
      const request = await this.pool.request();
      if (!tenant.Photo) {
        tenant.Photo = '';
      }
      if (!tenant.DisplayName) {
        tenant.DisplayName = '';
      }
      request.input('Id', sql.Int, tenant.Id);
      request.input('email', sql.VarChar(200), tenant.Email);
      request.input('UserName', sql.VarChar(200), tenant.UserName);
      request.input('DisplayName', sql.VarChar(200), tenant.DisplayName);
      request.input('ProfileUrl', sql.VarChar(1000), tenant.ProfileUrl);
      request.input('AuthToken', sql.VarChar(4000), tenant.AuthToken);
      request.input('RefreshToken', sql.VarChar(4000), tenant.RefreshToken);
      request.input('Photo', sql.VarChar(1000), tenant.Photo);
      const recordSet = await request.execute('SetTenant');
      console.log('==> saveTenant done successfully');
      return recordSet;
    } catch (ex) {
      console.log(`==> ${ex}`);
      return null;
    }
  }

  async SetRepoCollection(tenantId: string, org: string, repoCollectionName: string, repos: string) {
    await this.createPool();
    const request = await this.pool.request();
    request.input('TenantId', sql.VarChar(200), tenantId);
    request.input('Org', sql.VarChar(200), org);
    request.input('Repos', sql.VarChar(8000), repos);
    request.input('CollectionName', sql.VarChar(200), repoCollectionName);
    const recordSet = await request.execute('SetRepoCollection');
    return recordSet;
  }

  /*
    Saves only action === 'opened' || action === 'closed' || action === 'edited'
  */
 async SavePR4Repo(org: string, repo: string, body: string) {
  try {
    await this.createPool();
    let pr = JSON.parse(body);
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
    let nodes = pr.data.viewer.organization.repository.pullRequests.nodes;
    if  (nodes == undefined) {
      console.log (`==> No PR found for org: ${org} Repo: ${repo}`);
    }
    if  (nodes.length === 0) {
      console.log (`==> No PR found for org: ${org} Repo: ${repo}`);
    }
    
    if  (nodes.length > 0) {
      console.log (`==> ${nodes.length} PR found for org: ${org} Repo: ${repo}`);
    }
    

    //nodes.forEach(async (elm: any) => {
    for (let i = 0; i < nodes.length; i++) {
      let elm = nodes[i];
      if (elm.author.login == undefined) {
        console.log ('login is invalid')
        continue;
      }
      if (elm.author.login.startsWith('greenkeeper')) continue;
      if (elm.author.login.startsWith('semantic-release-bot')) continue;
      if (elm.action === 'opened' || elm.action === 'closed' || elm.action === 'edited') {
        //move one
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
      request.input('Org', sql.VarChar(1000), org);
      request.input('Repo', sql.VarChar(1000), repo);
      request.input('Url', sql.VarChar(1000), url);
      request.input('State', sql.VarChar(50), state);
      request.input('Title', sql.VarChar(5000), title);
      request.input('Created_At', sql.VarChar(20), created_at);
      request.input('Body', sql.VarChar(2000), pr_body);
      request.input('Login', sql.VarChar(100), login);
      request.input('Avatar_Url', sql.VarChar(2000), avatar_url);
      request.input('User_Url', sql.VarChar(2000), user_url);
      try {
        let x = await request.execute('SavePR4Repo');
        console.log (`==> Saved PR for org:${org} repo: ${repo}`);
      } catch (ex) {
        console.log(ex);
        console.log (`==> Error! While saving PR for org:${org} repo: ${repo}`);
      }
    }
  } catch (ex) {
    return false;
  }
  return true;
}

  private shredObject(obj: any): PullRequest {
    let pr: PullRequest = new PullRequest();

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

export {SQLRepository, Tenant};
