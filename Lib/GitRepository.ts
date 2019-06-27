import * as _ from 'lodash';
import {isNullOrUndefined} from 'util';
const NodeCache = require('node-cache');
import {SQLRepository} from './sqlRepository';
// const req = require('request');
const request = require('request-promise');

class GitRepository {
  httpOptions: any;
  url: string;
  sqlRepository: SQLRepository;

  constructor() {
    this.sqlRepository = new SQLRepository(null);
  }

  //https://developer.github.com/v3/repos/hooks/
  async GetHookStatus(tenantId: string, org: string) {
    const url = 'https://api.github.com/orgs/' + org + '/hooks';
    console.log('==>checking hook ' + url);
    this.sqlRepository.saveStatus(tenantId,'CHECK-HOOK', ' ' );
    const reqHeader = await this.makeGitRequest(tenantId, 'GET', url, 'GET');
    try{
    return new Promise((resolve, reject) => {
      request(reqHeader, (error: any, response: any, body: any) => {
        if (!error && response.statusCode === 200) {
          let a = JSON.parse(body);
          if (a.length > 0) {
            this.sqlRepository.saveStatus(tenantId,'CHECK-HOOK-SUCCESS-' +  org.substr(0,20), ' ' );
            resolve();
          } else {
            this.sqlRepository.saveStatus(tenantId,'CHECK-HOOK-FAIL-' +  org.substr(0,20), ' ' );
            reject();
          }
        } else {
          this.sqlRepository.saveStatus(tenantId,'CHECK-HOOK-FAIL-' +  org.substr(0,20), ' ' );
          reject();

        }
      });
    });
  } catch (ex) {
    console.log ('==>GetHookStatus: ' + ex.message)
  }
  }

  //Gets the PR for a Organization and a repo

  async getPullRequestFromGit(tenantId: string, org: string, repo: string) {
    console.log(`Getting PR from git for org: ${org}  repo :${repo}`);
    let graphQL =
      `{\"query\":\"{viewer  {  name          organization(login: \\"` +
      org +
      `\\") {     name        repository(name: \\"` +
      repo +
      `\\") { name            pullRequests(last: 10) {  nodes { id  url  state  title   permalink   createdAt  body  repository { name } author                                                                                                                                                                                { login  avatarUrl url                                           }            }          }        }      }    }  }\",\"variables\":{}}`;

    try {
      request(await this.makeGitRequest(tenantId, graphQL), async (error: any, response: any, body: any) => {
        if (response.statusCode === 200) {
          await this.sqlRepository.savePR4Repo(org, repo, body);
          this.sqlRepository.saveStatus(tenantId,'GET-PR-SUCCESS-'+  org.substr(0,20), `org: ${org}  repo: ${repo}`  );
        } else {
          console.log('GetPullRequestFromGit: ' + body);
          this.sqlRepository.saveStatus(tenantId,'GET-PR-FAIL-' +  org.substr(0,20), body );
        }
      });
    } catch (ex) {
      this.sqlRepository.saveStatus(tenantId,'GET-PR-FAIL-'+  org.substr(0,20), ex );
      console.log(`GetPullRequestFromGit Error! => ${ex}`);
    }
  }

  async fillPullRequest(tenantId: string, org: string, repo: string, bustTheCache: Boolean = false, getFromGit: Boolean = false, endCursor: string = '') {
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
      result = await this.sqlRepository.getPR4Repo(org, repo);
      if (result) {
        return result;
      } else {
        //Lets go to git
        await this.getPullRequestFromGit(tenantId, org, repo);
        //git call has put the PR in SQL, now lets get it from (cache).
        return await this.sqlRepository.getPR4Repo(org, repo);
      }
    } else {
      //Lets go to git
      await this.getPullRequestFromGit(tenantId, org, repo);
      //git call has put the PR in SQL, now lets get it from (cache).
      return await this.sqlRepository.getPR4Repo(org, repo);
    }
  }

  
  async getDevsFromGit(tenantId: string, org: string, endCursor: string = '') {
    let graphQL = '';
    if (endCursor) {
      graphQL = `{\"query\":\"query {  organization(login: ` + org + `) {  name  membersWithRole(first: 100 , after: \\"` + endCursor + `\\") { nodes { name login  email avatarUrl  } pageInfo { endCursor  hasNextPage }}}}\",\"variables\":{}}`;
    } else {
      graphQL = `{\"query\":\"query {  organization(login: ` + org + `) {  name  membersWithRole(first: 100) { nodes { name login  email  avatarUrl  } pageInfo { endCursor  hasNextPage }}}}\",\"variables\":{}}`;
    }
    try {
      request(
        await this.makeGitRequest(tenantId, graphQL),

        async (error: any, response: any, body: any) => {
          if (response.statusCode === 200) {
            let result = JSON.parse(body);
            if (!result.data) {
              console.log('No Devs found for org:' + org);
            } else {
              await this.sqlRepository.saveDevs(tenantId, org, result.data.organization.membersWithRole.nodes);
              if (result.data.organization.membersWithRole.pageInfo) {
                let pageInfo = result.data.organization.membersWithRole.pageInfo;
                if (pageInfo.hasNextPage) {
                  this.getDevsFromGit(tenantId, org, pageInfo.endCursor); //ooph! Recursive call
                }
              }
            }
          } else {
            console.log('getDevsFromGit: org - ' + org + ' - ' + body);
          }
        },
      );
      //git call has put the org in SQL, now lets get it from (cache).
      return await this.sqlRepository.getDevs(tenantId, org);
    } catch (ex) {
      console.log(ex);
    }
  }

  async getRepoFromGit(tenantId: string, org: string, endCursor: string = '') {
    let graphQL = '';
    if (endCursor) {
      graphQL = `{\"query\":\"query {  organization(login: ` + org + `) { repositories(first: 50 , after: \\"` + endCursor + `\\") {      nodes {id  name  isDisabled isArchived description homepageUrl createdAt } pageInfo { endCursor hasNextPage  } }  }}\",\"variables\":{}}`;
    } else {
      graphQL = `{\"query\":\"query {  organization(login: ` + org + `) { repositories(first: 50 ) {      nodes {id  name  isDisabled isArchived description homepageUrl createdAt } pageInfo { endCursor hasNextPage  } }  }}\",\"variables\":{}}`;
    }
    try {
      request(
        await this.makeGitRequest(tenantId, graphQL),

        async (error: any, response: any, body: any) => {
          if (response.statusCode === 200) {
            let result = JSON.parse(body);
            if (!result.data) {
              console.log('==> No repo found for org:' + org);
              this.sqlRepository.saveStatus(tenantId,'GET-REPO-SUCCESS-' +  org.substr(0,20), 'No repo found for org:' + org );
            } else {
              this.sqlRepository.saveStatus(tenantId,'GET-REPO-SUCCESS-' +  org.substr(0,20), `${result.data.organization.repositories.nodes.length} repo found for org: ${org}`);
              await this.sqlRepository.saveRepo(tenantId, org, result.data.organization.repositories.nodes);
              let pageInfo = result.data.organization.repositories.pageInfo;
              if (pageInfo.hasNextPage) {
                this.getRepoFromGit(tenantId, org, pageInfo.endCursor); //ooph! Recursive call
              }
            }
          } else {
            this.sqlRepository.saveStatus(tenantId,'GET-REPO-FAIL-'+  org.substr(0,20), `response status code: ${response.statusCode}` );
            console.log('GetRpoFromGit: org - ' + org + ' - ' + body);
          }
        },
      );
      //git call has put the org in SQL, now lets get it from (cache).
      return await this.sqlRepository.getRepo(tenantId, org, false);
    } catch (ex) {
      this.sqlRepository.saveStatus(tenantId,'GET-REPO-FAIL-'+  org.substr(0,20), ex );
      console.log(ex);
    }
  }

  async getRepos(tenantId: string, org: string, bustTheCache: Boolean = false, getFromGit: Boolean = false) {
    let cacheKey = 'GetRepos' + tenantId + org;
    if (bustTheCache) {
      this.sqlRepository.myCache.del(cacheKey);
    }

    if (getFromGit) {
      return await this.getRepoFromGit(tenantId, org);
    } else {
      //Get from local store
      let result = this.sqlRepository.myCache.get(cacheKey);
      if (result) {
        return result;
      }
      result = await this.sqlRepository.getRepo(tenantId, org);
      if (result[0]) {
        this.sqlRepository.myCache.set(cacheKey, result);
        return result;
      } else {
        return await this.getRepoFromGit(tenantId, org);
      }
    }
  }

  async makeGitRequest(tenantId: string, graphQL: string, gUri: string = 'https://api.github.com/graphql', method: string = 'POST') {
    try {
      const token = 'Bearer ' + (await this.sqlRepository.getToken(Number(tenantId)));
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
    } catch (ex) {
      console.log('MakeGitRequest: ' + ex + ' tenantId: ' + tenantId);
    }
  }

  async setupWebHook(tenantId: string, org: string) {
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
      await request(await this.makeGitRequest(tenantId, graphQL, 'https://api.github.com/orgs/' + org + '/hooks'), (error: any, response: any, body: any) => {
        if (response.statusCode === 201) {
          this.sqlRepository.saveStatus(tenantId,'SET-HOOK-SUCCESS-' +  org.substr(0,20), ' ' );
          console.log('Successfully hook is setup');
          return 1;
        } else {
          if (response.statusCode === 422) {
            this.sqlRepository.saveStatus(tenantId,'SET-HOOK-FAIL-' +  org.substr(0,20), `response status: ${response.statusCode}` );
            console.log('==> Warning: Hook already existing: ' + response.statusCode );
            return 422;
          }
          return 0;
        }
      });
    } catch (ex) {
      this.sqlRepository.saveStatus(tenantId,'SET-HOOK-FAIL-' + org.substr(0,20), ex );
      console.log(`==> Could not install webhook for ${org} Status: ${ex.statusCode}`);
      return 0;
    }
  }

  async UpdateDev4Org (tenantId: string, orgs: string[]) {
    for (let i = 0; i < orgs.length; i++) {
      this.getDevsFromGit (tenantId, orgs[i]);
    }
  }


  async getOrg(tenantId: string, bustTheCache: Boolean = false, getFromGit: Boolean = false) {
    //Lets check in our local sql tables first
    let cacheKey = 'GetOrg' + tenantId;

    if (bustTheCache) {
      this.sqlRepository.myCache.del(cacheKey);
    }

    if (!getFromGit) {
      //Get from local store
      const result = await this.sqlRepository.getOrg(tenantId);
      return result;
    }
    //Lets go to git
    const graphQL = `{\"query\": \"query { viewer {name organizations(last: 100) { nodes { name url }} }}\",\"variables\":{}}`;
    try {
      request(await this.makeGitRequest(tenantId, graphQL), async (error: any, response: any, body: any) => {
        if (response.statusCode === 200) {
          this.sqlRepository.saveStatus(tenantId,'GET-ORG-SUCCESS');
          let orgs = JSON.parse(response.body).data.viewer.organizations.nodes ;
          await this.sqlRepository.saveOrg(tenantId, orgs);
          this.UpdateDev4Org (tenantId, orgs);
        } else {
          this.sqlRepository.saveStatus(tenantId,'GET-ORG-FAIL', `status: ${response.statusCode}`);
          console.log('error: ' + response.statusCode);
          console.log(body);
        }
      });
      //git call has put the org in SQL, now lets get it from (cache).
      return await this.sqlRepository.getOrg(tenantId, false);
    } catch (ex) {
      this.sqlRepository.saveStatus(tenantId,'GET-ORG-FAIL', ex);
      console.log(ex);
    }
  }
}

export {GitRepository};
