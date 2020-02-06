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
// import * as _ from 'lodash';
const NodeCache = require('node-cache');
const request = require('request-promise');
const sqlRepository_1 = require("./sqlRepository");
class JiraRepository {
    constructor() {
        this.CACHE_DURATION_SEC = 6000; //50 min
        this.sqlRepository = new sqlRepository_1.SQLRepository(null);
        if (!this.myCache) {
            this.myCache = new NodeCache({ stdTTL: this.CACHE_DURATION_SEC, checkperiod: 120 });
        }
    }
    //returns the first org id
    getJiraOrg(jiraTenantId, bustTheCache = false) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.sqlRepository.getJiraOrg(jiraTenantId, bustTheCache);
        });
    }
    //return all the org details
    getJiraOrgs(jiraTenantId, bustTheCache = false) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.sqlRepository.getJiraOrgs(jiraTenantId, bustTheCache);
        });
    }
    getJiraUsers(jiraTenantId, org, bustTheCache = false) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`getJiraUsers: TenantId: ${jiraTenantId} Org: ${org}`);
            if (!bustTheCache) {
                //if bust the cache then goto Jira else get it from SQL
                const val = yield this.sqlRepository.getJiraUsers(jiraTenantId, org, bustTheCache);
                if (val)
                    return val;
            }
            // const org = '0e493c98-6102-463a-bc17-4980be22651b'; //await this.sqlRepository.getJiraResourceId (Number(jiraTenantId));
            const uri = org + '/rest/api/3/users/search?maxResults=500';
            try {
                return yield request(yield this.makeJiraRequest(jiraTenantId, uri), (error, response, body) => __awaiter(this, void 0, void 0, function* () {
                    if (response.statusCode === 200) {
                        const result = JSON.parse(body);
                        if (!result) {
                            // console.log(`GetJiraUsers: No Users found for tenant:${jiraTenantId} org: ${org}`);
                        }
                        else {
                            yield this.sqlRepository.saveJiraUsers(jiraTenantId, org, result);
                            // eslint-disable-next-line @typescript-eslint/no-floating-promises
                            this.sqlRepository.saveStatus(jiraTenantId, 'GET-JIRA-DEV-SUCCESS', ` Found ${result.length} devs for org: ${org}`);
                            return this.sqlRepository.getJiraUsers(jiraTenantId, org);
                            //No paging for now - Getting all 500 developers
                        }
                    }
                    else {
                        // console.log(`GetJiraUsers - status code: ${response.statusCode} tenant:${jiraTenantId} org: ${org}`);
                        return `"code: ${response.statusCode}, "message": "Unauthorize"`; //return 401
                    }
                }));
                //git call has put the org in SQL, now lets get it from (cache).
                // return await this.sqlRepository.getDevs(tenantId, org);
            }
            catch (ex) {
                console.log(` ==> GetJiraUsers: ${ex}`);
                if (JSON.parse(ex.error).code === 401) {
                    this.sqlRepository.dropJiraTokenFromCache(jiraTenantId);
                }
                return ex.error; //a proper json {code: 401, message: "Unauthorized"}
            }
        });
    }
    /*
      return before the await request is important to have unit test pass.
      
    */
    getJiraIssues(jiraTenantId, org = '0e493c98-6102-463a-bc17-4980be22651b', userId, status = '"In Progress" OR status="To Do"', fields = 'summary, status', bustTheCache = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const cacheKey = `getJiraIssues:${jiraTenantId}-${org}-${userId}`;
            if (!bustTheCache) {
                const val = this.myCache.get(cacheKey);
                if (val) {
                    console.log('Issues from cache');
                    return val;
                }
            }
            // const org = '0e493c98-6102-463a-bc17-4980be22651b'; //await this.sqlRepository.getJiraResourceId (Number(jiraTenantId));
            const uri = `${org}/rest/api/3/search?jql=assignee =${userId} AND ( status = ${status})&fields=${fields}`;
            console.log(`getJiraIssues: URL= ${uri}`);
            try {
                return yield request(yield this.makeJiraRequest(jiraTenantId, uri), (error, response, body) => __awaiter(this, void 0, void 0, function* () {
                    if (response.statusCode === 200) {
                        const result = JSON.parse(body);
                        if (!result) {
                            console.log(`GetJiraIssues: No issues found for tenant:${jiraTenantId} OrgId: ${org}`);
                            return result;
                        }
                        else {
                            console.log(` ==> getJiraIssues: ${result.issues.length} issues found!`);
                            if (result.issues.length > 0)
                                this.myCache.set(cacheKey, result.issues);
                            return result.issues;
                            // return await this.sqlRepository.saveJiraIssues(jiraTenantId, org, result);
                            //No paging for now - Getting all 500 developers
                        }
                    }
                    else {
                        console.log(`GetJiraIssues - status code: ${response.statusCode} tenant:${jiraTenantId} OrgId: ${org}`);
                        //401 coming here
                        this.sqlRepository.dropJiraTokenFromCache(jiraTenantId);
                        return response.statusCode;
                    }
                }));
                //git call has put the org in SQL, now lets get it from (cache).
                // return await this.sqlRepository.getDevs(tenantId, org);
            }
            catch (ex) {
                console.log(` ==> GetJiraIssues: ${ex}`);
                if (JSON.parse(ex.error).code === 401) {
                    this.sqlRepository.dropJiraTokenFromCache(jiraTenantId);
                }
            }
        });
    }
    //Get the token for the tenant and attaches to the call.
    makeJiraRequest(jiraTenantId, gUri, body = '', method = 'GET') {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const token = 'Bearer ' + (yield this.sqlRepository.getJiraToken(jiraTenantId));
                //  console.log(`==> JiraToken: ${token} `);
                const header = {
                    method: method,
                    uri: 'https://api.atlassian.com/ex/jira/' + gUri,
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: token,
                        Accept: 'application/json',
                        'cache-control': 'no-cache',
                        'user-agent': 'Git-Gator',
                    },
                    body: body,
                };
                return header;
            }
            catch (ex) {
                console.log(`==> MakeJiraRequest: Error: ${ex} - tenantId: ${jiraTenantId}`);
            }
        });
    }
}
exports.JiraRepository = JiraRepository;
//# sourceMappingURL=JiraRepository.js.map