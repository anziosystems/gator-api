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
const sqlRepository_1 = require("./sqlRepository");
// const req = require('request');
const request = require('request-promise');
class GitRepository {
    constructor() {
        this.sqlRepository = new sqlRepository_1.SQLRepository(null);
    }
    //https://developer.github.com/v3/repos/hooks/
    GetHookStatus(tenantId, org) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = 'https://api.github.com/orgs/' + org + '/hooks';
            console.log('checking hook' + url);
            const reqHeader = yield this.makeGitRequest(tenantId, 'GET', url, 'GET');
            return new Promise((resolve, reject) => {
                request(reqHeader, (error, response, body) => {
                    if (!error && response.statusCode === 200) {
                        let a = JSON.parse(body);
                        if (a.length > 0) {
                            resolve();
                        }
                        else {
                            reject();
                        }
                    }
                    else {
                        reject();
                    }
                });
            });
        });
    }
    //Gets the PR for a Organization and a repo
    getPullRequestFromGit(tenantId, org, repo) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Getting PR from git for org: ${org}  repo :${repo}`);
            let graphQL = `{\"query\":\"{viewer  {  name          organization(login: \\"` +
                org +
                `\\") {     name        repository(name: \\"` +
                repo +
                `\\") { name            pullRequests(last: 10) {  nodes { id  url  state  title   permalink   createdAt  body  repository { name } author                                                                                                                                                                                { login  avatarUrl url                                           }            }          }        }      }    }  }\",\"variables\":{}}`;
            try {
                request(yield this.makeGitRequest(tenantId, graphQL), (error, response, body) => __awaiter(this, void 0, void 0, function* () {
                    if (response.statusCode === 200) {
                        yield this.sqlRepository.savePR4Repo(org, repo, body);
                    }
                    else {
                        console.log('GetPullRequestFromGit: ' + body);
                    }
                }));
            }
            catch (ex) {
                console.log(`GetPullRequestFromGit Error! => ${ex}`);
            }
        });
    }
    fillPullRequest(tenantId, org, repo, bustTheCache = false, getFromGit = false, endCursor = '') {
        return __awaiter(this, void 0, void 0, function* () {
            let cacheKey = 'FillPullRequest' + tenantId + org + repo;
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
                    return yield this.sqlRepository.getPR4Repo(org, repo);
                }
            }
            else {
                //Lets go to git
                yield this.getPullRequestFromGit(tenantId, org, repo);
                //git call has put the PR in SQL, now lets get it from (cache).
                return yield this.sqlRepository.getPR4Repo(org, repo);
            }
        });
    }
    getDevsFromGit(tenantId, org, endCursor = '') {
        return __awaiter(this, void 0, void 0, function* () {
            let graphQL = '';
            if (endCursor) {
                graphQL = `{\"query\":\"query {  organization(login: ` + org + `) {  name  membersWithRole(first: 100 , after: \\"` + endCursor + `\\") { nodes { name login  email avatarUrl  } pageInfo { endCursor  hasNextPage }}}}\",\"variables\":{}}`;
            }
            else {
                graphQL = `{\"query\":\"query {  organization(login: ` + org + `) {  name  membersWithRole(first: 100) { nodes { name login  email  avatarUrl  } pageInfo { endCursor  hasNextPage }}}}\",\"variables\":{}}`;
            }
            try {
                request(yield this.makeGitRequest(tenantId, graphQL), (error, response, body) => __awaiter(this, void 0, void 0, function* () {
                    if (response.statusCode === 200) {
                        let result = JSON.parse(body);
                        if (!result.data) {
                            console.log('No Devs found for org:' + org);
                        }
                        else {
                            yield this.sqlRepository.saveDevs(tenantId, org, result.data.organization.membersWithRole.nodes);
                            if (result.data.organization.membersWithRole.pageInfo) {
                                let pageInfo = result.data.organization.membersWithRole.pageInfo;
                                if (pageInfo.hasNextPage) {
                                    this.getDevsFromGit(tenantId, org, pageInfo.endCursor); //ooph! Recursive call
                                }
                            }
                        }
                    }
                    else {
                        console.log('getDevsFromGit: org - ' + org + ' - ' + body);
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
                        let result = JSON.parse(body);
                        if (!result.data) {
                            console.log('No organization found for org:' + org);
                        }
                        else {
                            yield this.sqlRepository.saveRepo(tenantId, org, result.data.organization.repositories.nodes);
                            let pageInfo = result.data.organization.repositories.pageInfo;
                            if (pageInfo.hasNextPage) {
                                this.getRepoFromGit(tenantId, org, pageInfo.endCursor); //ooph! Recursive call
                            }
                        }
                    }
                    else {
                        console.log('GetRpoFromGit: org - ' + org + ' - ' + body);
                    }
                }));
                //git call has put the org in SQL, now lets get it from (cache).
                return yield this.sqlRepository.getRepo(tenantId, org, false);
            }
            catch (ex) {
                console.log(ex);
            }
        });
    }
    getRepos(tenantId, org, bustTheCache = false, getFromGit = false) {
        return __awaiter(this, void 0, void 0, function* () {
            let cacheKey = 'GetRepos' + tenantId + org;
            if (bustTheCache) {
                this.sqlRepository.myCache.del(cacheKey);
            }
            if (getFromGit) {
                return yield this.getRepoFromGit(tenantId, org);
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
                    return yield this.getRepoFromGit(tenantId, org);
                }
            }
        });
    }
    makeGitRequest(tenantId, graphQL, gUri = 'https://api.github.com/graphql', method = 'POST') {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const token = 'Bearer ' + (yield this.sqlRepository.getToken(Number(tenantId)));
                let header = {
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
    setupWebHook(tenantId, org) {
        return __awaiter(this, void 0, void 0, function* () {
            //Lets go to git
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
                        console.log('Successfully hook is setup');
                        console.log(body);
                        return 1;
                    }
                    else {
                        if (response.statusCode === 422) {
                            console.log('error: ' + response.statusCode);
                            console.log(body);
                            return 1;
                        }
                        return 0;
                    }
                });
            }
            catch (ex) {
                console.log(`WebHook setup fail: ${ex}`);
            }
        });
    }
    getOrg(tenantId, bustTheCache = false, getFromGit = false) {
        return __awaiter(this, void 0, void 0, function* () {
            //Lets check in our local sql tables first
            let cacheKey = 'GetOrg' + tenantId;
            if (bustTheCache) {
                this.sqlRepository.myCache.del(cacheKey);
            }
            if (!getFromGit) {
                //Get from local store
                const result = yield this.sqlRepository.getOrg(tenantId);
                return result;
            }
            //Lets go to git
            const graphQL = `{\"query\": \"query { viewer {name organizations(last: 100) { nodes { name url }} }}\",\"variables\":{}}`;
            try {
                request(yield this.makeGitRequest(tenantId, graphQL), (error, response, body) => __awaiter(this, void 0, void 0, function* () {
                    if (response.statusCode === 200) {
                        yield this.sqlRepository.saveOrg(tenantId, JSON.parse(response.body).data.viewer.organizations.nodes);
                    }
                    else {
                        console.log('error: ' + response.statusCode);
                        console.log(body);
                    }
                }));
                //git call has put the org in SQL, now lets get it from (cache).
                return yield this.sqlRepository.getOrg(tenantId, false);
            }
            catch (ex) {
                console.log(ex);
            }
        });
    }
}
exports.GitRepository = GitRepository;
//# sourceMappingURL=gitRepository.js.map