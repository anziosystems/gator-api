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
const sqlRepository_1 = require("./sqlRepository");
const util_1 = require("util");
const req = require('request');
const request = require('request-promise');
//if ever have async issues use requestAsync
//usage: await requestAsync
const requestAsync = util_1.promisify(require('request-promise'));
class GitRepository {
    constructor() {
        this.sqlRepository = new sqlRepository_1.SQLRepository(null);
    }
    //https://developer.github.com/v3/repos/hooks/
    GetHookStatus(tenantId, org) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = 'https://api.github.com/orgs/' + org + '/hooks';
            console.log('==>checking hook ' + url);
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.sqlRepository.saveStatus(tenantId, 'CHECK-HOOK', ' ');
            const reqHeader = yield this.makeGitRequest(tenantId, 'GET', url, 'GET');
            try {
                return new Promise((resolve, reject) => {
                    request(reqHeader, (error, response, body) => {
                        if (!error && response.statusCode === 200) {
                            const a = JSON.parse(body);
                            if (a.length > 0) {
                                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                                this.sqlRepository.saveStatus(tenantId, 'CHECK-HOOK-SUCCESS-' + org.substr(0, 20), ' ');
                                resolve(true);
                            }
                            else {
                                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                                this.sqlRepository.saveStatus(tenantId, 'CHECK-HOOK-FAIL-' + org.substr(0, 20), ' ');
                                reject(false);
                            }
                        }
                        else {
                            // eslint-disable-next-line @typescript-eslint/no-floating-promises
                            this.sqlRepository.saveStatus(tenantId, 'CHECK-HOOK-FAIL-' + org.substr(0, 20), ' ');
                            reject(false);
                        }
                    });
                });
            }
            catch (ex) {
                console.log('==>GetHookStatus: ' + ex.message);
            }
        });
    }
    //Gets the PR for a Organization and a repo
    getPullRequestFromGit(tenantId, org, repo) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Getting PR from git for org: ${org}  repo :${repo}`);
            const graphQL = `{\"query\":\"{viewer  {  name          organization(login: \\"` +
                org +
                `\\") {     name        repository(name: \\"` +
                repo +
                `\\") { name            pullRequests(last: 25) {  nodes { id  url  state  title   permalink   createdAt  body  repository { name } author                                                                                                                                                                                { login  avatarUrl url                                           }            }          }        }      }    }  }\",\"variables\":{}}`;
            try {
                request(yield this.makeGitRequest(tenantId, graphQL), (error, response, body) => __awaiter(this, void 0, void 0, function* () {
                    if (response.statusCode === 200) {
                        yield this.sqlRepository.savePR4Repo(org, repo, body);
                        // eslint-disable-next-line @typescript-eslint/no-floating-promises
                        this.sqlRepository.saveStatus(tenantId, 'GET-PR-SUCCESS-' + org.substr(0, 20), `org: ${org}  repo: ${repo}`);
                    }
                    else {
                        console.log('GetPullRequestFromGit: ' + body);
                        // eslint-disable-next-line @typescript-eslint/no-floating-promises
                        this.sqlRepository.saveStatus(tenantId, 'GET-PR-FAIL-' + org.substr(0, 20), body);
                    }
                }));
            }
            catch (ex) {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                this.sqlRepository.saveStatus(tenantId, 'GET-PR-FAIL-' + org.substr(0, 20), ex);
                console.log(`GetPullRequestFromGit Error! => ${ex}`);
            }
        });
    }
    fillPullRequest(tenantId, org, repo, bustTheCache = false, getFromGit = false, endCursor = '') {
        return __awaiter(this, void 0, void 0, function* () {
            const cacheKey = 'FillPullRequest' + tenantId + org + repo;
            if (bustTheCache) {
                this.sqlRepository.myCache.del(cacheKey);
            }
            if (!getFromGit) {
                //Get from local store
                let result = this.sqlRepository.myCache.get(cacheKey);
                if (result) {
                    return result;
                }
                //Get from sql
                result = yield this.sqlRepository.getPR4Repo(org, repo);
                if (result) {
                    return result;
                }
                else {
                    //Lets go to git
                    yield this.getPullRequestFromGit(tenantId, org, repo);
                    //git call has put the PR in SQL, now lets get it from (cache).
                    return this.sqlRepository.getPR4Repo(org, repo);
                }
            }
            else {
                //Lets go to git
                yield this.getPullRequestFromGit(tenantId, org, repo);
                //git call has put the PR in SQL, now lets get it from (cache).
                return this.sqlRepository.getPR4Repo(org, repo);
            }
        });
    }
    getDevsFromGit(tenantId, org, endCursor = '') {
        return __awaiter(this, void 0, void 0, function* () {
            let graphQL = '';
            //url:"https://github.com/ncats" name: "National Center ..."
            //we need to get this name in the url
            const orgName = org.url.substr(org.url.lastIndexOf('/') + 1);
            if (endCursor) {
                graphQL = `{\"query\":\"query {  organization(login:\\"${orgName}\\") {  name  membersWithRole(first: 100 , after: \\"` + endCursor + `\\") { nodes { name login  email avatarUrl  } pageInfo { endCursor  hasNextPage }}}}\",\"variables\":{}}`;
            }
            else {
                graphQL = `{\"query\":\"query {  organization(login: \\"${orgName}\\") {  name  membersWithRole(first: 100) { nodes { name login  email  avatarUrl  } pageInfo { endCursor  hasNextPage }}}}\",\"variables\":{}}`;
            }
            try {
                request(yield this.makeGitRequest(tenantId, graphQL), (error, response, body) => __awaiter(this, void 0, void 0, function* () {
                    if (response.statusCode === 400) {
                        console.log(`getDevsFromGit: No Devs found for org: ${orgName} - ${response.body}`);
                        // eslint-disable-next-line @typescript-eslint/no-floating-promises
                        this.sqlRepository.saveStatus(tenantId, 'GET-DEV-FAIL', `${orgName} - ${response.body}`);
                        return;
                    }
                    if (response.statusCode === 200) {
                        const result = JSON.parse(body);
                        if (!result.data) {
                            console.log(`getDevsFromGit: No Devs found for org: ${orgName}`);
                            // eslint-disable-next-line @typescript-eslint/no-floating-promises
                            this.sqlRepository.saveStatus(tenantId, 'GET-DEV-FAIL', `${orgName}`);
                        }
                        else {
                            // console.log(`getDevsFromGit: ${result.data.organization.membersWithRole.nodes.length} dev found for org: ${orgName}`);
                            yield this.sqlRepository.saveDevs(tenantId, orgName, result.data.organization.membersWithRole.nodes);
                            yield this.sqlRepository.saveStatus(tenantId, 'GET-DEV-SUCCESS', `${result.data.organization.membersWithRole.nodes.length} Devs updated for ${orgName}`);
                            if (result.data.organization.membersWithRole.pageInfo) {
                                const pageInfo = result.data.organization.membersWithRole.pageInfo;
                                if (pageInfo.hasNextPage) {
                                    // eslint-disable-next-line @typescript-eslint/no-floating-promises
                                    this.getDevsFromGit(tenantId, org, pageInfo.endCursor); //Recursive call
                                }
                            }
                        }
                    }
                    else {
                        console.log(`
             org - ${orgName} - ${body}`);
                    }
                }));
                //git call has put the org in SQL, now lets get it from (cache).
                return yield this.sqlRepository.getDevs(tenantId, org);
            }
            catch (ex) {
                console.log(ex);
            }
        });
    }
    getRepoFromGit(tenantId, org, endCursor = '') {
        return __awaiter(this, void 0, void 0, function* () {
            let graphQL = '';
            if (endCursor) {
                graphQL = `{\"query\":\"query {  organization(login: ` + org + `) { repositories(first: 50 , after: \\"` + endCursor + `\\") {      nodes {id  name  isDisabled isArchived description homepageUrl createdAt } pageInfo { endCursor hasNextPage  } }  }}\",\"variables\":{}}`;
            }
            else {
                graphQL = `{\"query\":\"query {  organization(login: ` + org + `) { repositories(first: 50 ) {      nodes {id  name  isDisabled isArchived description homepageUrl createdAt } pageInfo { endCursor hasNextPage  } }  }}\",\"variables\":{}}`;
            }
            try {
                request(yield this.makeGitRequest(tenantId, graphQL), (error, response, body) => __awaiter(this, void 0, void 0, function* () {
                    if (response.statusCode === 200) {
                        const result = JSON.parse(body);
                        if (!result.data) {
                            console.log('==> No repo found for org:' + org);
                            // eslint-disable-next-line @typescript-eslint/no-floating-promises
                            this.sqlRepository.saveStatus(tenantId, 'GET-REPO-SUCCESS-' + org.substr(0, 20), 'No repo found for org:' + org);
                        }
                        else {
                            // eslint-disable-next-line @typescript-eslint/no-floating-promises
                            this.sqlRepository.saveStatus(tenantId, 'GET-REPO-SUCCESS-' + org.substr(0, 20), `${result.data.organization.repositories.nodes.length} repo found for org: ${org}`);
                            yield this.sqlRepository.saveRepo(tenantId, org, result.data.organization.repositories.nodes);
                            const pageInfo = result.data.organization.repositories.pageInfo;
                            if (pageInfo.hasNextPage) {
                                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                                this.getRepoFromGit(tenantId, org, pageInfo.endCursor); // Recursive call
                            }
                        }
                    }
                    else {
                        // eslint-disable-next-line @typescript-eslint/no-floating-promises
                        this.sqlRepository.saveStatus(tenantId, 'GET-REPO-FAIL-' + org.substr(0, 20), `response status code: ${response.statusCode}`);
                        console.log('GetRpoFromGit: org - ' + org + ' - ' + body);
                    }
                }));
                //git call has put the org in SQL, now lets get it from (cache).
                return yield this.sqlRepository.getRepo(tenantId, org, false);
            }
            catch (ex) {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                this.sqlRepository.saveStatus(tenantId, 'GET-REPO-FAIL-' + org.substr(0, 20), ex);
                console.log('==> getRepoFromGit: Error-' + ex);
            }
        });
    }
    getRepos(tenantId, org, bustTheCache = false, getFromGit = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const cacheKey = 'GetRepos' + tenantId + org;
            if (bustTheCache) {
                this.sqlRepository.myCache.del(cacheKey);
            }
            if (getFromGit) {
                return this.getRepoFromGit(tenantId, org);
            }
            else {
                //Get from local store
                let result = this.sqlRepository.myCache.get(cacheKey);
                if (result) {
                    return result;
                }
                result = yield this.sqlRepository.getRepo(tenantId, org);
                if (result[0]) {
                    this.sqlRepository.myCache.set(cacheKey, result);
                    return result;
                }
                else {
                    return this.getRepoFromGit(tenantId, org);
                }
            }
        });
    }
    makeGitRequest(tenantId, graphQL, gUri = 'https://api.github.com/graphql', method = 'POST') {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const token = 'Bearer ' + (yield this.sqlRepository.getToken(Number(tenantId)));
                const header = {
                    method: method,
                    uri: gUri,
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: token,
                        Accept: 'application/vnd.github.machine-man-preview+json',
                        'cache-control': 'no-cache',
                        'user-agent': 'Gator',
                    },
                    body: graphQL,
                };
                return header;
            }
            catch (ex) {
                console.log('MakeGitRequest: ' + ex + ' tenantId: ' + tenantId);
            }
        });
    }
    /*
    returns:
    
      404 - Cannot install the hook
      422 - Already hook present
      201 - Hook installed successfully
    */
    setupWebHook(tenantId, org) {
        return __awaiter(this, void 0, void 0, function* () {
            //Lets go to git
            let result;
            const graphQL = `{
      "name": "web",
      "active": true,
      "events": [
        "push",
        "pull_request"
      ],
      "config": {
        "url": "https://gatorgithook.azurewebsites.net/api/httptrigger",
        "content_type": "application/json",
        "secret": "Secret"
      }
    }`;
            try {
                yield request(yield this.makeGitRequest(tenantId, graphQL, 'https://api.github.com/orgs/' + org + '/hooks'), (error, response, body) => {
                    if (response.statusCode === 201) {
                        // eslint-disable-next-line @typescript-eslint/no-floating-promises
                        this.sqlRepository.saveStatus(tenantId, 'SET-HOOK-SUCCESS-' + org.substr(0, 20), ' ');
                        console.log('Successfully hook is setup');
                    }
                    else {
                        if (response.statusCode === 422) {
                            // eslint-disable-next-line @typescript-eslint/no-floating-promises
                            this.sqlRepository.saveStatus(tenantId, 'SET-HOOK-FAIL-' + org.substr(0, 20), `response status: ${response.statusCode}`);
                            console.log('==> Warning: Hook already existing: ' + response.statusCode);
                        }
                    }
                    result = response.statusCode;
                    return result;
                    //Another excption happen after this from git call. hence this wrap of try - catch
                    //see up there are two awaits. and git exception is about hook already present
                });
            }
            catch (ex) {
                console.log('==> setupWebHook' + ex);
                return result;
            }
        });
    }
    UpdateDev4Org(tenantId, orgs) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const o of orgs) {
                yield this.getDevsFromGit(tenantId, o);
            }
        });
    }
    /* This should be the model function for how to call git queries
    Promise wrapper await etc
    */
    getOrg(tenantId, bustTheCache = false, getFromGit = false) {
        return __awaiter(this, void 0, void 0, function* () {
            //Lets check in our local sql tables first
            const cacheKey = 'GetOrg' + tenantId;
            if (bustTheCache) {
                this.sqlRepository.myCache.del(cacheKey);
            }
            if (!getFromGit) {
                //Get from local store
                const result = yield this.sqlRepository.getOrg(tenantId);
                if (result)
                    return result;
            }
            //Lets go to git
            const graphQL = `{\"query\": \"query { viewer {name organizations(last: 100) { nodes { name url }} }}\",\"variables\":{}}`;
            /* Without this promise wrap this code will not work */
            const gitReq = yield this.makeGitRequest(tenantId, graphQL);
            return new Promise((resolve, reject) => {
                try {
                    request(gitReq, (error, response, body) => __awaiter(this, void 0, void 0, function* () {
                        if (response) {
                            if (response.statusCode === 200) {
                                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                                this.sqlRepository.saveStatus(tenantId, 'GET-ORG-SUCCESS');
                                const orgs = JSON.parse(response.body).data.viewer.organizations.nodes;
                                yield this.sqlRepository.saveOrg(tenantId, orgs);
                                yield this.UpdateDev4Org(tenantId, orgs);
                                const result = yield this.sqlRepository.getOrg(tenantId);
                                resolve(result);
                            }
                            else {
                                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                                this.sqlRepository.saveStatus(tenantId, 'GET-ORG-FAIL', `status: ${response.statusCode}`);
                                console.log('getOrg: error: ' + response.statusCode);
                                console.log('getOrg: error: ' + body);
                                reject(null);
                            }
                        }
                        else {
                            console.log(`getOrg no results returned:  ${error}`);
                            reject(error);
                        }
                    }));
                }
                catch (ex) {
                    // eslint-disable-next-line @typescript-eslint/no-floating-promises
                    this.sqlRepository.saveStatus(tenantId, 'GET-ORG-FAIL', ex);
                    console.log('getOrg' + ex);
                    reject();
                }
            }).catch(ex => {
                console.log(`getOrg:  ${ex}`);
            });
        });
    }
}
exports.GitRepository = GitRepository;
//# sourceMappingURL=GitRepository.js.map