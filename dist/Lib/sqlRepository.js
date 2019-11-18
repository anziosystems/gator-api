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
const _ = require("lodash");
const util_1 = require("util");
//import {RedisStorage, LabShareCache} from "@labshare/services-cache";
const NodeCache = require('node-cache');
const dotenv = require('dotenv');
dotenv.config();
let CryptoJS = require('crypto-js');
class PullRequest {
}
class Tenant {
}
exports.Tenant = Tenant;
class JiraTenant {
}
exports.JiraTenant = JiraTenant;
/*
  TenantId is GitId for the logged in user
*/
class SQLRepository {
    constructor(obj) {
        this.sqlConfigSetting = {};
        this.CACHE_DURATION_SEC = 6000; //50 min
        this.MESSAGE_LEN = 2000;
        this.TENANT_LEN = 50;
        this.ORG_LEN = 200;
        this.STATUS_LEN = 50;
        this.REPO_LEN = 200;
        this.REPO_ID_LEN = 100;
        this.URL_LEN = 2000;
        this.STATE_LEN = 50;
        this.ACTION_LEN = 50;
        this.TITLE_LEN = 2000;
        this.BODY_LEN = 2000;
        this.LOGIN_LEN = 100;
        this.AVATAR_URL_LEN = 2000;
        this.USER_URL_LEN = 2000;
        //for get calls there may not be any obj
        if (obj) {
            this.pr = this.shredObject(obj);
            this.raw = obj.body;
        }
        if (!this.myCache) {
            this.myCache = new NodeCache({ stdTTL: this.CACHE_DURATION_SEC, checkperiod: 120 });
            // this.myCache  = new LabShareCache(new RedisStorage(
            //   {
            //        "host": "gator-cache.redis.cache.windows.net",
            //        "port": 6379
            //   }));
        }
        this.createPool();
    }
    createPool() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.pool) {
                this.sqlConfigSetting.server = process.env.SQL_Server;
                this.sqlConfigSetting.database = process.env.SQL_Database;
                this.sqlConfigSetting.user = process.env.SQL_User;
                this.sqlConfigSetting.password = process.env.SQL_Password;
                this.sqlConfigSetting.port = 1433;
                this.sqlConfigSetting.encrypt = true;
                yield new sql.ConnectionPool(this.sqlConfigSetting).connect().then((pool) => {
                    this.pool = pool;
                    //console.log(`==> createPool is successfull`);
                });
            }
        });
    }
    //return 0 if not a valid tenant or the token more than 7 days old
    checkToken(tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let cacheKey = 'CheckToken' + tenantId;
                let val = this.myCache.get(cacheKey);
                if (val) {
                    return val;
                }
                yield this.createPool();
                const request = yield this.pool.request();
                request.input('Id', sql.Int, tenantId);
                const recordSet = yield request.execute('CheckTenant');
                this.myCache.set(cacheKey, recordSet.recordset[0].Result === 1);
                return recordSet.recordset[0].Result === 1;
            }
            catch (ex) {
                console.log(`==> CheckToken {ex}`);
                return false;
            }
        });
    }
    //return 0 if not a valid tenant or the token more than 7 days old
    checkJiraToken(tenantId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let cacheKey = 'CheckJiraToken' + tenantId;
                let val = this.myCache.get(cacheKey);
                if (val) {
                    return val;
                }
                yield this.createPool();
                const request = yield this.pool.request();
                request.input('Id', sql.Int, tenantId);
                const recordSet = yield request.execute('CheckJiraTenant');
                this.myCache.set(cacheKey, recordSet.recordset[0].Result === 1);
                return recordSet.recordset[0].Result === 1;
            }
            catch (ex) {
                console.log(`==> CheckJiraToken {ex}`);
                return false;
            }
        });
    }
    getRepoPR(org, repo, day, pageSize) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let cacheKey = 'GetRepoPR' + org + repo + day;
                let val = this.myCache.get(cacheKey);
                if (val) {
                    return val;
                }
                yield this.createPool();
                const request = yield this.pool.request();
                request.input('repo', sql.VarChar(this.REPO_LEN), repo);
                request.input('org', sql.VarChar(this.ORG_LEN), org);
                request.input('day', sql.Int, day);
                request.input('PageSize', sql.Int, pageSize);
                const recordSet = yield request.execute('GetRepoPR');
                if (recordSet) {
                    this.myCache.set(cacheKey, recordSet.recordset);
                    return recordSet.recordset;
                }
                else
                    return false;
            }
            catch (ex) {
                console.log(`==> getRepoPR {ex}`);
                return false;
            }
        });
    }
    getAllRepoCollection4TenantOrg(tenantId, org, bustTheCache = false) {
        return __awaiter(this, void 0, void 0, function* () {
            let cacheKey = 'getAllRepoCollection4TenantOrg' + org + tenantId;
            let val = this.myCache.get(cacheKey);
            if (val) {
                return val;
            }
            yield this.createPool();
            const request = yield this.pool.request();
            request.input('TenantId', sql.Int, Number(tenantId));
            request.input('Org', sql.VarChar(this.ORG_LEN), org);
            const recordSet = yield request.execute('[GetAllRepoCollection4TenantOrg]');
            if (recordSet) {
                this.myCache.set(cacheKey, recordSet.recordset);
                return recordSet.recordset;
            }
            else
                return false;
        });
    }
    getDevs(tenantId, org) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createPool();
            const request = yield this.pool.request();
            request.input('org', sql.VarChar(this.ORG_LEN), org);
            request.input('TenantId', sql.Int, Number(tenantId));
            const recordSet = yield request.execute('GetDevs');
            return recordSet.recordset;
        });
    }
    // Date, Ctr, State (open, closed) will be returned
    GetGraphData4XDays(org, day, bustTheCache = false) {
        return __awaiter(this, void 0, void 0, function* () {
            let cacheKey = 'GetGraphData4XDays-' + org + day;
            if (bustTheCache) {
                this.myCache.del(cacheKey);
            }
            let val = this.myCache.get(cacheKey);
            if (val) {
                return val;
            }
            yield this.createPool();
            const request = yield this.pool.request();
            request.input('day', sql.Int, day);
            request.input('org', sql.VarChar(this.ORG_LEN), org);
            const recordSet = yield request.execute('GetGraphData4XDays');
            if (recordSet) {
                this.myCache.set(cacheKey, recordSet.recordset);
            }
            return recordSet.recordset;
        });
    }
    saveStatus(tenantId, status, message = '') {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createPool();
            const request = yield this.pool.request();
            if (!message) {
                message = '';
            }
            else {
                if (message.length >= this.MESSAGE_LEN) {
                    message = message.substr(0, this.MESSAGE_LEN - 2);
                }
            }
            request.input('status', sql.VarChar(this.STATUS_LEN), status);
            request.input('message', sql.VarChar(this.MESSAGE_LEN), message);
            request.input('TenantId', sql.Int, Number(tenantId));
            const recordSet = yield request.execute('saveStatus');
            if (recordSet) {
                return recordSet.rowsAffected.length;
            }
            else {
                return 0;
            }
        });
    }
    getRepo(tenantId, org, bustTheCache = false) {
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
            request.input('TenantId', sql.Int, Number(tenantId));
            request.input('Org', sql.VarChar(this.ORG_LEN), org);
            const recordSet = yield request.execute('GetRepos');
            if (recordSet) {
                this.myCache.set(cacheKey, recordSet.recordset);
            }
            return recordSet.recordset;
        });
    }
    getOrg(tenantId, bustTheCache = false) {
        return __awaiter(this, void 0, void 0, function* () {
            let cacheKey = 'GetOrg' + tenantId;
            if (bustTheCache) {
                this.myCache.del(cacheKey);
            }
            let val = this.myCache.get(cacheKey);
            if (val) {
                return val;
            }
            yield this.createPool();
            const request = yield this.pool.request();
            request.input('TenantId', sql.Int, Number(tenantId));
            const recordSet = yield request.execute('GetOrg');
            if (recordSet.recordset) {
                this.myCache.set(cacheKey, recordSet.recordset);
            }
            return recordSet.recordset;
        });
    }
    getJiraOrg(tenantId, bustTheCache = false) {
        return __awaiter(this, void 0, void 0, function* () {
            let orgs = yield this.getJiraOrgs(tenantId, bustTheCache);
            let val = orgs[0].id; //default returning the first one
            return val;
        });
    }
    getJiraOrgs(tenantId, bustTheCache = false) {
        return __awaiter(this, void 0, void 0, function* () {
            let cacheKey = 'GetJiraOrgs' + tenantId;
            let orgs;
            if (bustTheCache) {
                this.myCache.del(cacheKey);
            }
            let val = this.myCache.get(cacheKey);
            if (val) {
                return val;
            }
            yield this.createPool();
            const request = yield this.pool.request();
            request.input('TenantId', sql.Int, Number(tenantId));
            const recordSet = yield request.execute('GetJiraOrg');
            if (recordSet.recordset) {
                orgs = JSON.parse(recordSet.recordset[0].AccessibleResources);
                this.myCache.set(cacheKey, orgs);
            }
            return orgs;
        });
    }
    //No one calls this yet, the SP is called directly from another SP GetTenant. Leaving for future use.
    setActiveTenant(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createPool();
            const request = yield this.pool.request();
            request.input('TenantId', sql.Int, id);
            let recordSet = yield request.execute('SaveActiveTenant');
            if (recordSet) {
                return recordSet.rowsAffected.length;
            }
            else
                return 0;
        });
    }
    //Token will return UserName, DisplayName, ProfileURL, AuthToken, LastUpdated and Photo (URL)
    getTenant(id) {
        return __awaiter(this, void 0, void 0, function* () {
            let cacheKey = 'GetTenant-' + id;
            let val = this.myCache.get(cacheKey);
            if (val) {
                return val;
            }
            yield this.createPool();
            const request = yield this.pool.request();
            request.input('Id', sql.Int, id);
            let recordSet = yield request.execute('GetTenant');
            if (recordSet.recordset.length > 0) {
                this.myCache.set(cacheKey, recordSet.recordset);
                console.log(`==> getTenant is successfull for id:${id} `);
                return recordSet.recordset;
            }
            else
                return 0;
        });
    }
    getJiraTenant(id) {
        return __awaiter(this, void 0, void 0, function* () {
            let cacheKey = 'getJiraTenant-' + id;
            let val = this.myCache.get(cacheKey);
            if (val) {
                return val;
            }
            yield this.createPool();
            const request = yield this.pool.request();
            request.input('Id', sql.Int, id);
            let recordSet = yield request.execute('GetJiraTenant');
            if (recordSet.recordset.length > 0) {
                this.myCache.set(cacheKey, recordSet.recordset);
                console.log(`==> getJiraTenant is successfull for id:${id} `);
                return recordSet.recordset;
            }
            else
                return 0;
        });
    }
    //GetPR4Repo
    getPR4Repo(org, repo, bustTheCache = false) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createPool();
            let cacheKey = 'GetPR4Repo -' + org + repo;
            let val = this.myCache.get(cacheKey);
            if (val) {
                return val;
            }
            const request = yield this.pool.request();
            request.input('org', sql.VarChar(this.ORG_LEN), org);
            request.input('repo', sql.VarChar(this.REPO_LEN), repo);
            const recordSet = yield request.execute('GetPR4Repo');
            if (recordSet.recordset.length > 0) {
                this.myCache.set(cacheKey, recordSet.recordset);
                return recordSet.recordset;
            }
            else {
                return 0;
            }
        });
    }
    getToken(id) {
        return __awaiter(this, void 0, void 0, function* () {
            let cacheKey = 'GetTenant -' + id; //cacheKey is GetTenant because i am reading there cache value. This is different from norm
            let val = this.myCache.get(cacheKey);
            if (val) {
                return this.decrypt(val.recordset[0].Auth_Token, id.toString());
            }
            const recordSet = yield this.getTenant(id);
            if (recordSet)
                return this.decrypt(recordSet[0].Auth_Token, id.toString());
            else
                return;
        });
    }
    getJiraToken(id) {
        return __awaiter(this, void 0, void 0, function* () {
            let cacheKey = 'GetJiraTenant -' + id; //cacheKey is GetTenant because i am reading there cache value. This is different from norm
            let val = this.myCache.get(cacheKey);
            if (val) {
                return this.decrypt(val.recordset[0].Auth_Token, id.toString());
            }
            const recordSet = yield this.getJiraTenant(id);
            if (recordSet)
                return recordSet[0].Auth_Token;
            else
                return;
        });
    }
    getTopDev4LastXDays(org, day = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            let cacheKey = 'getTopDev4LastXDays' + org + day;
            let val = this.myCache.get(cacheKey);
            if (val) {
                return val;
            }
            yield this.createPool();
            const request = yield this.pool.request();
            if (!org) {
                throw new Error('tenant cannot be null');
            }
            request.input('Org', sql.VarChar(this.ORG_LEN), org);
            request.input('Day', sql.Int, day);
            const recordSet = yield request.execute('TopDevForLastXDays');
            if (recordSet.recordset) {
                this.myCache.set(cacheKey, recordSet.recordset);
                return recordSet.recordset;
            }
            else {
                return;
            }
        });
    }
    getPR4Id(org, id = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createPool();
            const request = yield this.pool.request();
            if (!org) {
                throw new Error('tenant cannot be null');
            }
            request.input('Org', sql.VarChar(this.ORG_LEN), org);
            request.input('Id', sql.Int, id);
            const recordSet = yield request.execute('GetPR4Id');
            return recordSet.recordset;
        });
    }
    getPRCount4LastXDays(org, day = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createPool();
            let cacheKey = 'PRCount4LastXDays' + org + day.toString();
            let val = this.myCache.get(cacheKey);
            if (val) {
                return val;
            }
            const request = yield this.pool.request();
            if (!org) {
                throw new Error('org cannot be null');
            }
            request.input('Org', sql.VarChar(this.ORG_LEN), org);
            request.input('Day', sql.Int, day);
            const recordSet = yield request.execute('PRCount4LastXDays');
            if (recordSet.recordset.length > 0) {
                this.myCache.set(cacheKey, recordSet.recordset);
            }
            return recordSet.recordset;
        });
    }
    getPR4Dev(org, day = 1, login, action, pageSize) {
        return __awaiter(this, void 0, void 0, function* () {
            let cacheKey = 'PullRequest4Dev' + org + day.toString() + login;
            console.log(`getPR4Dev: org:{0} day: {1} login: {2} action: {3} pageSize: {4}`, org, day, login, action, pageSize);
            let val = this.myCache.get(cacheKey);
            if (val) {
                console.log('getPR4Dev cache hit');
                return val;
            }
            yield this.createPool();
            const request = yield this.pool.request();
            if (!org) {
                throw new Error('org cannot be null');
            }
            if (pageSize === 0)
                pageSize = 10;
            request.input('Org', sql.VarChar(this.ORG_LEN), org);
            if (util_1.isNullOrUndefined(login) || login === '') {
                request.input('Login', sql.VarChar(this.LOGIN_LEN), 'null');
            }
            else {
                request.input('Login', sql.VarChar(this.LOGIN_LEN), login);
            }
            if (util_1.isNullOrUndefined(action) || action === '') {
                request.input('Action', sql.VarChar(this.ACTION_LEN), 'null');
            }
            else {
                request.input('Action', sql.VarChar(this.ACTION_LEN), action);
            }
            request.input('Day', sql.Int, day);
            request.input('pageSize', sql.Int, pageSize);
            const recordSet = yield request.execute('PR4Devs');
            console.log(`getPR4Dev records found: {0}`, recordSet.recordset.length);
            if (recordSet.recordset.length > 0) {
                this.myCache.set(cacheKey, recordSet.recordset);
            }
            return recordSet.recordset;
        });
    }
    /*
    PullRequest took longest time between open and close
    */
    getLongestPR(org, day = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createPool();
            const request = yield this.pool.request();
            if (!org) {
                throw new Error('org cannot be null');
            }
            request.input('Org', sql.VarChar(this.ORG_LEN), org);
            request.input('Day', sql.Int, day);
            const recordSet = yield request.execute('LongestPR');
            return recordSet.recordset;
        });
    }
    getTopRepo4XDays(org, day = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            let cacheKey = 'getTopRepo4XDays' + org + day.toString();
            let val = this.myCache.get(cacheKey);
            if (val) {
                return val;
            }
            yield this.createPool();
            const request = yield this.pool.request();
            if (!org) {
                throw new Error('org cannot be null');
            }
            request.input('Org', sql.VarChar(this.ORG_LEN), org);
            request.input('Day', sql.Int, day);
            const recordSet = yield request.execute('GetTopRepos4XDays');
            if (recordSet) {
                this.myCache.set(cacheKey, recordSet.recordset);
            }
            return recordSet.recordset;
        });
    }
    getPR4LastXDays(org, day = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            let cacheKey = 'getPR4LastXDays' + org + day.toString();
            let val = this.myCache.get(cacheKey);
            if (val) {
                return val;
            }
            yield this.createPool();
            const request = yield this.pool.request();
            if (!org) {
                throw new Error('org cannot be null');
            }
            request.input('Org', sql.VarChar(this.ORG_LEN), org);
            request.input('Day', sql.Int, day);
            const recordSet = yield request.execute('PR4LastXDays');
            if (recordSet) {
                this.myCache.set(cacheKey, recordSet.recordset);
            }
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
    saveJiraTenant(tenant) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // console.log('==> inside saveTenant');
                yield this.createPool();
                const request = yield this.pool.request();
                if (!tenant.Photo) {
                    tenant.Photo = '';
                }
                if (!tenant.DisplayName) {
                    tenant.DisplayName = '';
                }
                //Token is kept decrypted in DB
                let token = tenant.AuthToken; //No Encryption for Jira
                request.input('Id', sql.Int, tenant.Id);
                request.input('email', sql.VarChar(200), tenant.Email);
                request.input('UserName', sql.VarChar(200), tenant.UserName);
                request.input('DisplayName', sql.VarChar(200), tenant.DisplayName);
                request.input('ProfileUrl', sql.Char(500), tenant.ProfileUrl);
                request.input('AuthToken', sql.VARCHAR(4000), token);
                request.input('RefreshToken', sql.VARCHAR(4000), tenant.RefreshToken);
                request.input('Photo', sql.Char(500), tenant.Photo);
                request.input('AccessibleResources', sql.Char(8000), JSON.stringify(tenant.AccessibleResources));
                const recordSet = yield request.execute('SaveJiraTenant');
                console.log('==> saveJiraTenant done successfully');
                return recordSet.rowsAffected[0];
            }
            catch (ex) {
                console.log(`==> ${ex}`);
                return ex;
            }
        });
    }
    saveTenant(tenant) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // console.log('==> inside saveTenant');
                yield this.createPool();
                const request = yield this.pool.request();
                if (!tenant.Photo) {
                    tenant.Photo = '';
                }
                if (!tenant.DisplayName) {
                    tenant.DisplayName = '';
                }
                let token = this.encrypt(tenant.AuthToken, tenant.Id.toString());
                request.input('Id', sql.Int, tenant.Id);
                request.input('email', sql.VarChar(200), tenant.Email);
                request.input('UserName', sql.VarChar(200), tenant.UserName);
                request.input('DisplayName', sql.VarChar(200), tenant.DisplayName);
                request.input('ProfileUrl', sql.VarChar(1000), tenant.ProfileUrl);
                request.input('AuthToken', sql.VarChar(4000), token);
                request.input('RefreshToken', sql.VarChar(4000), tenant.RefreshToken);
                request.input('Photo', sql.VarChar(1000), tenant.Photo);
                const recordSet = yield request.execute('SaveTenant');
                console.log('==> saveTenant done successfully');
                return recordSet.rowsAffected[0];
            }
            catch (ex) {
                console.log(`==> ${ex}`);
                return ex;
            }
        });
    }
    encrypt(token, secret) {
        let ciphertext = CryptoJS.AES.encrypt(token, secret);
        return ciphertext;
    }
    decrypt(token, secret) {
        let bytes = CryptoJS.AES.decrypt(token, secret);
        let plaintext = bytes.toString(CryptoJS.enc.Utf8);
        console.log('Decrypt is success!');
        return plaintext;
    }
    /*
      Saves only action === 'opened' || action === 'closed' || action === 'edited'
    */
    savePR4Repo(org, repo, body) {
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
                if (nodes == undefined) {
                    console.log(`==> No PR found for org: ${org} Repo: ${repo}`);
                }
                if (nodes.length === 0) {
                    console.log(`==> No PR found for org: ${org} Repo: ${repo}`);
                }
                if (nodes.length > 0) {
                    console.log(`==> ${nodes.length} PR found for org: ${org} Repo: ${repo}`);
                }
                //nodes.forEach(async (elm: any) => {
                for (let i = 0; i < nodes.length; i++) {
                    let elm = nodes[i];
                    if (elm.author.login == undefined) {
                        console.log('login is invalid');
                        continue;
                    }
                    if (elm.author.login.startsWith('greenkeep'))
                        continue;
                    if (elm.author.login.startsWith('semantic-release-bot'))
                        continue;
                    if (elm.action === 'opened' || elm.action === 'closed' || elm.action === 'edited') {
                        //move on
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
                        let x = yield request.execute('SavePR4Repo');
                        return x.rowsAffected[0];
                    }
                    catch (ex) {
                        console.log(`==> Error! While saving PR for org:${org} repo: ${repo} - ${ex}`);
                    }
                }
            }
            catch (ex) {
                return false;
            }
            return true;
        });
    }
    /* return number of orgs */
    saveOrg(tenantId, orgs) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.createPool();
                const request = yield this.pool.request();
                for (let i = 0; i < orgs.length; i++) {
                    let org = orgs[i];
                    request.input('TenantId', sql.Int, Number(tenantId));
                    request.input('Org', sql.VarChar(this.ORG_LEN), org.url.substr('https://github.com/'.length));
                    request.input('DisplayName', sql.VarChar(this.ORG_LEN), org.name);
                    const recordSet = yield request.execute('SaveOrg');
                }
                return orgs.length;
            }
            catch (ex) {
                return ex;
            }
        });
    }
    saveJiraDevs(tenantId, org, devs) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (devs == undefined)
                    return;
                if (devs.length === 0) {
                    console.log('No devs to be saved!');
                    return;
                }
                yield this.createPool();
                const request = yield this.pool.request();
                for (let i = 0; i < devs.length; i++) {
                    let dev = devs[i];
                    let createdAt = String(dev.createdAt).substr(0, 10);
                    //console.log(`==> SaveDev = org: ${org} dev - Name: ${dev.name} \t| Email: ${dev.email} \t| login: ${dev.login} \t| ${dev.avatarUrl}`);
                    request.input('TenantId', sql.Int, Number(tenantId));
                    request.input('Org', sql.VarChar(this.ORG_LEN), org); //
                    request.input('accountId', sql.VarChar(100), dev.accountId); //rsarosh@hotmail.com
                    request.input('displayName', sql.VarChar(200), dev.displayName); //Rafat Sarosh
                    request.input('avatarUrls', sql.Text, JSON.stringify(dev.avatarUrls)); //rsarosh
                    request.input('self', sql.VarChar(500), dev.self);
                    const recordSet = yield request.execute('SaveJiraDev');
                    //return recordSet.rowsAffected[0];
                }
                console.log(`saved ${devs.length} Jira Dev`);
            }
            catch (ex) {
                return ex;
            }
        });
    }
    saveDevs(tenantId, org, devs) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (devs == undefined)
                    return;
                if (devs.length === 0) {
                    console.log('No devs to be saved!');
                    return;
                }
                yield this.createPool();
                const request = yield this.pool.request();
                for (let i = 0; i < devs.length; i++) {
                    let dev = devs[i];
                    let createdAt = String(dev.createdAt).substr(0, 10);
                    //console.log(`==> SaveDev = org: ${org} dev - Name: ${dev.name} \t| Email: ${dev.email} \t| login: ${dev.login} \t| ${dev.avatarUrl}`);
                    request.input('TenantId', sql.Int, Number(tenantId));
                    request.input('Org', sql.VarChar(this.ORG_LEN), org); //
                    request.input('email', sql.VarChar(200), dev.email); //rsarosh@hotmail.com
                    request.input('name', sql.VarChar(200), dev.name); //Rafat Sarosh
                    request.input('login', sql.VarChar(this.LOGIN_LEN), dev.login); //rsarosh
                    request.input('avatarUrl', sql.VarChar(1200), dev.avatarUrl);
                    const recordSet = yield request.execute('SaveDev');
                    //return recordSet.rowsAffected[0];
                }
                console.log(`saved ${devs.length} Git Dev`);
                return devs.length;
            }
            catch (ex) {
                return ex;
            }
        });
    }
    saveRepo(tenantId, org, repos) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (repos == undefined)
                    return;
                if (repos.length === 0) {
                    console.log('No repo to be saved!');
                    return;
                }
                yield this.createPool();
                const request = yield this.pool.request();
                let repoDetails;
                for (let i = 0; i < repos.length; i++) {
                    let repo = repos[i];
                    let createdAt = String(repo.createdAt).substr(0, 10);
                    // console.log(`SaveRepo = org: ${org} repo: ${repo.name}`);
                    request.input('TenantId', sql.Int, Number(tenantId));
                    request.input('Org', sql.VarChar(this.ORG_LEN), org);
                    request.input('Id', sql.VarChar(this.REPO_ID_LEN), repo.id);
                    request.input('name', sql.VarChar(this.REPO_LEN), repo.name);
                    request.input('desc', sql.VarChar(200), repo.description);
                    request.input('HomePage', sql.VarChar(200), repo.homepageUrl);
                    request.input('CreatedAt', sql.VarChar(10), createdAt);
                    const recordSet = yield request.execute('SaveRepos');
                    return recordSet.rowsAffected[0];
                }
            }
            catch (ex) {
                return ex;
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
            console.log(`==> ${err}`);
        }
        return pr;
    }
}
exports.SQLRepository = SQLRepository;
//# sourceMappingURL=sqlRepository.js.map