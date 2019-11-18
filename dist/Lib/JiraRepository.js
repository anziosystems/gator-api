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
const NodeCache = require('node-cache');
const request = require('request-promise');
const sqlRepository_1 = require("./sqlRepository");
class JiraRepository {
    constructor() {
        this.sqlRepository = new sqlRepository_1.SQLRepository(null);
    }
    //returns the first org id
    getJiraOrg(jiraTenantId, bustTheCache = false) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.sqlRepository.getJiraOrg(jiraTenantId);
        });
    }
    //return all the org details
    getJiraOrgs(jiraTenantId, bustTheCache = false) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.sqlRepository.getJiraOrgs(jiraTenantId);
        });
    }
    GetJiraUsers(jiraTenantId, org = '0e493c98-6102-463a-bc17-4980be22651b', bustTheCache = false) {
        return __awaiter(this, void 0, void 0, function* () {
            // const org = '0e493c98-6102-463a-bc17-4980be22651b'; //await this.sqlRepository.getJiraResourceId (Number(jiraTenantId));
            const uri = org + '/rest/api/3/users/search?maxResults=500';
            try {
                request(yield this.makeJiraRequest(jiraTenantId, uri), (error, response, body) => __awaiter(this, void 0, void 0, function* () {
                    if (response.statusCode === 200) {
                        let result = JSON.parse(body);
                        if (!result) {
                            console.log(`GetJiraUsers: No Devs found for tenant:${jiraTenantId} ResourceId: ${org}`);
                        }
                        else {
                            return yield this.sqlRepository.saveJiraDevs(jiraTenantId, org, result);
                            //No paging for now - Getting all 500 developers
                        }
                    }
                    else {
                        console.log(`GetJiraUsers - status code: ${response.statusCode} tenant:${jiraTenantId} ResourceId: ${org}`);
                    }
                }));
                //git call has put the org in SQL, now lets get it from (cache).
                // return await this.sqlRepository.getDevs(tenantId, org);
            }
            catch (ex) {
                console.log(` ==> GetJiraUsers: ${ex}`);
            }
        });
    }
    /*
      return before the await request is important to have unit test pass.
      
    */
    getJiraIssues(jiraTenantId, org = '0e493c98-6102-463a-bc17-4980be22651b', userId, status = '"In Progress" OR status="To Do"', fields = 'summary, status', bustTheCache = false) {
        return __awaiter(this, void 0, void 0, function* () {
            // const org = '0e493c98-6102-463a-bc17-4980be22651b'; //await this.sqlRepository.getJiraResourceId (Number(jiraTenantId));
            const uri = `${org}/rest/api/3/search?jql=assignee =${userId} AND ( status = ${status})&fields=${fields}`;
            try {
                return yield request(yield this.makeJiraRequest(jiraTenantId, uri), (error, response, body) => {
                    if (response.statusCode === 200) {
                        let result = JSON.parse(body);
                        if (!result) {
                            console.log(`GetJiraIssues: No issues found for tenant:${jiraTenantId} ResourceId: ${org}`);
                            return result;
                        }
                        else {
                            console.log(` ==> getJiraIssues: ${result.issues.length} issues found!`);
                            return result.issues;
                            // return await this.sqlRepository.saveJiraIssues(jiraTenantId, org, result);
                            //No paging for now - Getting all 500 developers
                        }
                    }
                    else {
                        console.log(`GetJiraIssues - status code: ${response.statusCode} tenant:${jiraTenantId} ResourceId: ${org}`);
                    }
                });
                //git call has put the org in SQL, now lets get it from (cache).
                // return await this.sqlRepository.getDevs(tenantId, org);
            }
            catch (ex) {
                console.log(` ==> GetJiraIssues: ${ex}`);
            }
        });
    }
    //Get the token for the tenant and attaches to the call.
    makeJiraRequest(jiraTenantId, gUri, body = '', method = 'GET') {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const token = 'Bearer ' + (yield this.sqlRepository.getJiraToken(Number(jiraTenantId)));
                console.log(`==> JiraToken: Got the token`);
                let header = {
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