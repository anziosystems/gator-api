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
let sql = require('mssql');
const sqlConfig_1 = require("./sqlConfig");
const _ = require("lodash");
const util_1 = require("util");
const NodeCache = require('node-cache');
class PullRequest {
}
class Tenant {
}
exports.Tenant = Tenant;
class SQLRepository {
    constructor(obj) {
        //for get calls there may not be any obj
        if (obj) {
            this.pr = this.shredObject(obj);
            this.raw = obj.body;
        }
        if (!this.myCache) {
            this.myCache = new NodeCache({ stdTTL: 300, checkperiod: 120 });
        }
        this.createPool();
    }
    createPool() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.pool) {
                yield new sql.ConnectionPool(sqlConfig_1.sqlConfigSetting).connect().then((pool) => {
                    this.pool = pool;
                });
            }
        });
    }
    //return 0 if not a valid tenant or the token more than 7 days old
    CheckToken(tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.createPool();
                const request = yield this.pool.request();
                request.input('Id', sql.Int, tenantId);
                const recordSet = yield request.execute('CheckTenant');
                return recordSet.recordset[0].Result === 1;
            }
            catch (ex) {
                console.log(ex);
                return false;
            }
        });
    }
    GetRepositoryPR(org, repo, day, pageSize) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.createPool();
                const request = yield this.pool.request();
                request.input('repo', sql.VarChar(100), repo);
                request.input('org', sql.VarChar(100), org);
                request.input('day', sql.Int, day);
                request.input('PageSize', sql.Int, pageSize);
                const recordSet = yield request.execute('GetRepositoryPR');
                return recordSet.recordset[0].Result === 1;
            }
            catch (ex) {
                console.log(ex);
                return false;
            }
        });
    }
    saveTenant(tenant) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.createPool();
                const request = yield this.pool.request();
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
                const recordSet = yield request.execute('SetTenant');
                return recordSet;
            }
            catch (ex) {
                return ex;
            }
        });
    }
    SetRepoCollection(tenantId, org, repoCollectionName, repos) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createPool();
            const request = yield this.pool.request();
            request.input('TenantId', sql.VarChar(200), tenantId);
            request.input('Org', sql.VarChar(200), org);
            request.input('Repos', sql.VarChar(8000), repos);
            request.input('CollectionName', sql.VarChar(200), repoCollectionName);
            const recordSet = yield request.execute('SetRepoCollection');
            return recordSet;
        });
    }
    GetAllRepoCollection4TenantOrg(tenantId, org, bustTheCache = false) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createPool();
            const request = yield this.pool.request();
            request.input('TenantId', sql.VarChar(200), tenantId);
            request.input('Org', sql.VarChar(200), org);
            const recordSet = yield request.execute('[GetAllRepoCollection4TenantOrg]');
            return recordSet;
        });
    }
    GetRepoCollectionByName(repoCollectionName, bustTheCache = false) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createPool();
            const request = yield this.pool.request();
            request.input('CollectionName', sql.VarChar(200), repoCollectionName);
            const recordSet = yield request.execute('GetRepoCollectionByName');
            return recordSet.recordset;
        });
    }
    SaveRepo(email, org, repos) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.createPool();
                const request = yield this.pool.request();
                let repoDetails;
                for (let i = 0; i < repos.length; i++) {
                    let repo = repos[i];
                    let createdAt = String(repo.createdAt).substr(0, 10);
                    console.log('SaveRepo' + org + ' ' + repo);
                    request.input('TenantId', sql.VarChar(200), email);
                    request.input('Organization', sql.VarChar(200), org);
                    request.input('Id', sql.VarChar(200), repo.id);
                    request.input('name', sql.VarChar(200), repo.name);
                    request.input('desc', sql.VarChar(200), repo.description);
                    request.input('HomePage', sql.VarChar(200), repo.homepageUrl);
                    request.input('CreatedAt', sql.VarChar(10), createdAt);
                    const recordSet = yield request.execute('SetRepos');
                }
            }
            catch (ex) {
                return ex;
            }
        });
    }
    GetRepo(tenantId, org, bustTheCache = false) {
        return __awaiter(this, void 0, void 0, function* () {
            let cacheKey = 'GetRepo' + tenantId + org;
            if (bustTheCache) {
                this.myCache.del(cacheKey);
            }
            let val = this.myCache.get(cacheKey);
            if (val) {
                return val;
            }
            yield this.createPool();
            const request = yield this.pool.request();
            request.input('TenantId', sql.VarChar(200), tenantId);
            request.input('Organization', sql.VarChar(200), org);
            const recordSet = yield request.execute('GetRepos');
            if (recordSet) {
                this.myCache.set(cacheKey, recordSet.recordset);
            }
            return recordSet.recordset;
        });
    }
    SaveOrg(email, orgs) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.createPool();
                const request = yield this.pool.request();
                for (let i = 0; i < orgs.length; i++) {
                    let org = orgs[i];
                    request.input('TenantId', sql.VarChar(200), email);
                    request.input('Org', sql.VarChar(1000), org.name);
                    const recordSet = yield request.execute('SetOrg');
                }
            }
            catch (ex) {
                return ex;
            }
        });
    }
    GetOrg(email, bustTheCache = false) {
        return __awaiter(this, void 0, void 0, function* () {
            let cacheKey = 'GetOrg' + email;
            if (bustTheCache) {
                this.myCache.del(cacheKey);
            }
            let val = this.myCache.get(cacheKey);
            if (val) {
                return val;
            }
            yield this.createPool();
            const request = yield this.pool.request();
            request.input('TenantId', sql.VarChar(200), email);
            const recordSet = yield request.execute('GetOrg');
            if (recordSet.recordset) {
                this.myCache.set(cacheKey, recordSet.recordset);
            }
            return recordSet.recordset;
        });
    }
    //Token will return UserName, DisplayName, ProfileURL, AuthToken, LastUpdated and Photo (URL)
    GetTenant(id) {
        return __awaiter(this, void 0, void 0, function* () {
            let cacheKey = 'GetTenant-' + id;
            let val = this.myCache.get(cacheKey);
            if (val) {
                return val;
            }
            yield this.createPool();
            const request = yield this.pool.request();
            request.input('Id', sql.Int, id);
            const recordSet = yield request.execute('GetTenant');
            if (recordSet.recordset.length > 0) {
                this.myCache.set(cacheKey, recordSet.recordset);
                return recordSet.recordset;
            }
            else
                return;
        });
    }
    //GetPR
    GetPR4Repo(org, repo, bustTheCache = false) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createPool();
            let cacheKey = 'GetPR4Repo -' + org + repo;
            let val = this.myCache.get(cacheKey);
            if (val) {
                return val;
            }
            const request = yield this.pool.request();
            request.input('org', sql.VarChar(1000), org);
            request.input('repo', sql.VarChar(1000), repo);
            const recordSet = yield request.execute('GetPR4Repo');
            if (recordSet.recordset.length > 0) {
                this.myCache.set(cacheKey, recordSet.recordset);
                return recordSet.recordset;
            }
            else {
                return;
            }
        });
    }
    /*
      Saves only action === 'opened' || action === 'closed' || action === 'edited'
    */
    SavePR4Repo(org, repo, body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.createPool();
                let pr = JSON.parse(body);
                let id;
                let url;
                let state;
                let title;
                let created_at;
                let pr_body;
                let login;
                let avatar_url;
                let user_url;
                const request = yield this.pool.request();
                let nodes = pr.data.viewer.organization.repository.pullRequests.nodes;
                //nodes.forEach(async (elm: any) => {
                for (let i = 0; i < nodes.length; i++) {
                    let elm = nodes[i];
                    if ('greenkeeper' === elm.author.login)
                        continue;
                    if (elm.action === 'opened' || elm.action === 'closed' || elm.action === 'edited') {
                        //move one
                    }
                    else {
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
                        let x = yield request.execute('SavePR4Repo');
                    }
                    catch (ex) {
                        console.log(ex);
                    }
                }
            }
            catch (ex) {
                return false;
            }
            return true;
        });
    }
    GetToken(id) {
        return __awaiter(this, void 0, void 0, function* () {
            let cacheKey = 'GetTenant -' + id;
            let val = this.myCache.get(cacheKey);
            if (val) {
                return val.recordset[0].Auth_Token;
            }
            const recordSet = yield this.GetTenant(id);
            if (recordSet)
                return recordSet[0].Auth_Token;
            else
                return;
        });
    }
    TopDevForLastXDays(org, day = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createPool();
            const request = yield this.pool.request();
            if (!org) {
                throw new Error('tenant cannot be null');
            }
            request.input('Org', sql.VarChar(100), org);
            request.input('Day', sql.Int, day);
            const recordSet = yield request.execute('TopDevForLastXDays');
            return recordSet.recordset;
        });
    }
    GetPullRequestForId(tenant, id = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createPool();
            const request = yield this.pool.request();
            if (!tenant) {
                throw new Error('tenant cannot be null');
            }
            request.input('Org', sql.VarChar(100), tenant);
            request.input('Id', sql.Int, id);
            const recordSet = yield request.execute('GetPullRequestforId');
            return recordSet.recordset;
        });
    }
    PullRequestCountForLastXDays(org, day = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createPool();
            let cacheKey = 'PullRequestCountForLastXDays' + org + day.toString();
            let val = this.myCache.get(cacheKey);
            if (val) {
                return val;
            }
            const request = yield this.pool.request();
            if (!org) {
                throw new Error('tenant cannot be null');
            }
            request.input('Org', sql.VarChar(100), org);
            request.input('Day', sql.Int, day);
            const recordSet = yield request.execute('PullRequestCountForLastXDays');
            if (recordSet.recordset.length > 0) {
                this.myCache.set(cacheKey, recordSet.recordset);
            }
            return recordSet.recordset;
        });
    }
    PullRequest4Dev(org, day = 1, login, action, pageSize) {
        return __awaiter(this, void 0, void 0, function* () {
            let cacheKey = 'PullRequest4Dev' + org + day.toString() + login;
            let val = this.myCache.get(cacheKey);
            if (val) {
                return val;
            }
            yield this.createPool();
            const request = yield this.pool.request();
            if (!org) {
                throw new Error('tenant cannot be null');
            }
            if (pageSize === 0)
                pageSize = 10;
            request.input('Org', sql.VarChar(100), org);
            if (util_1.isNullOrUndefined(login) || login === '') {
                request.input('Login', sql.VarChar(200), 'null');
            }
            else {
                request.input('Login', sql.VarChar(200), login);
            }
            if (util_1.isNullOrUndefined(action) || action === '') {
                request.input('Action', sql.VarChar(50), 'null');
            }
            else {
                request.input('Action', sql.VarChar(50), action);
            }
            request.input('Day', sql.Int, day);
            request.input('pageSize', sql.Int, pageSize);
            const recordSet = yield request.execute('PullRequest4Devs');
            if (recordSet.recordset.length > 0) {
                this.myCache.set(cacheKey, recordSet.recordset);
            }
            return recordSet.recordset;
        });
    }
    LongestPullRequest(tenant, day = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createPool();
            const request = yield this.pool.request();
            if (!tenant) {
                throw new Error('tenant cannot be null');
            }
            request.input('Org', sql.VarChar(100), tenant);
            request.input('Day', sql.Int, day);
            const recordSet = yield request.execute('LongestPullRequest');
            return recordSet;
        });
    }
    GetTopRespositories4XDays(org, day = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createPool();
            const request = yield this.pool.request();
            if (!org) {
                throw new Error('tenant cannot be null');
            }
            request.input('Org', sql.VarChar(100), org);
            request.input('Day', sql.Int, day);
            const recordSet = yield request.execute('GetTopRespositories4XDays');
            return recordSet.recordset;
        });
    }
    PullRequestForLastXDays(tenant, day = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createPool();
            const request = yield this.pool.request();
            if (!tenant) {
                throw new Error('tenant cannot be null');
            }
            request.input('Org', sql.VarChar(100), tenant);
            request.input('Day', sql.Int, day);
            const recordSet = yield request.execute('PullRequestForLastXDays');
            return recordSet.recordset;
        });
    }
    getItem(query, page, pageSize) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.createPool();
                const request = yield this.pool.request();
                const rs = yield request.query(query);
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
                let s = '[';
                let ctr = 0;
                let startCtr = (page - 1) * pageSize;
                if (startCtr === 0) {
                    startCtr = 1;
                }
                let endCtr = page * pageSize;
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
            }
            catch (err) {
                console.log(err);
            }
        });
    }
    shredObject(obj) {
        let pr = new PullRequest();
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
        }
        catch (err) {
            console.log(err);
        }
        return pr;
    }
}
exports.SQLRepository = SQLRepository;
//# sourceMappingURL=sqlRepository.js.map