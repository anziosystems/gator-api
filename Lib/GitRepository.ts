/* eslint-disable no-unused-vars */
/* eslint-disable no-useless-escape */
import * as _ from 'lodash';
import {SQLRepository} from './sqlRepository';
// eslint-disable-next-line no-unused-vars
import {rejects} from 'assert';
import {promisify} from 'util';
const req = require('request');
const request = require('request-promise');

//if ever have async issues use requestAsync
//usage: await requestAsync
const requestAsync = promisify(require('request-promise'));

class GitRepository {
  httpOptions: any;
  url: string;
  sqlRepository: SQLRepository;

  constructor() {
    this.sqlRepository = new SQLRepository(null);
  }

  //https://developer.github.com/v3/repos/hooks/
  async GetHookStatus(userId: string, org: string) {
    const url = 'https://api.github.com/orgs/' + org + '/hooks';
    console.log('==>checking hook ' + url);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.sqlRepository.saveStatus(userId, 'CHECK-HOOK', ' ');
    const reqHeader = await this.makeGitRequestHeader(userId, 'GET', url, 'GET');
    try {
      return new Promise((resolve, reject) => {
        request(reqHeader, (error: any, response: any, body: any) => {
          if (!error && response.statusCode === 200) {
            const a = JSON.parse(body);
            if (a.length > 0) {
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              this.sqlRepository.saveStatus(userId, 'CHECK-HOOK-SUCCESS-' + org.substr(0, 20), ' ');
              resolve(true);
            } else {
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              this.sqlRepository.saveStatus(userId, 'CHECK-HOOK-FAIL-' + org.substr(0, 20), ' ');
              reject(false);
            }
          } else {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.sqlRepository.saveStatus(userId, 'CHECK-HOOK-FAIL-' + org.substr(0, 20), ' ');
            reject(false);
          }
        });
      });
    } catch (ex) {
      console.log('==>GetHookStatus: ' + ex.message);
    }
  }

  //Gets the PR for a Organization and a repo
  async getPullRequestFromGit(userId: string, org: string, repo: string) {
    const graphQL =
      `{\"query\":\"{viewer  {  name          organization(login: \\"` +
      org +
      `\\") {     name        repository(name: \\"` +
      repo +
      `\\") { name            pullRequests(last: 1) {  nodes { id  url  state  title   permalink   createdAt  body  repository { name } author                                                                                                                                                                                { login  avatarUrl url                                           }            }          }        }      }    }  }\",\"variables\":{}}`;

    try {
      const gitReq = await this.makeGitRequestHeader(userId, graphQL);
      return new Promise((resolve, reject) => {
        try {
          request(gitReq, async (error: any, response: any, body: any) => {
            if (!response) {
              reject(`No Response from GetPullRequestFromGit: for org: ${org} Repo: ${repo}`);
            } else {
              if (response.statusCode === 200) {
                let result = await this.sqlRepository.savePR4Repo(org, repo, body);
                resolve(result);
              } else {
                console.log('[E] GetPullRequestFromGit: ' + body);
                reject(0);
              }
            }
          });
        } catch (ex) {
          console.log(`[E] GetPullRequestFromGit Error! => ${ex}`);
          reject(0);
        }
      });
    } catch (ex) {
      console.log(`[E] GetPullRequestFromGit Error! => ${ex}`);
      return 0;
    }
  }

  //Wrapper function for getPullRequestFromGit
  //This method is filling the PullRequest in SQL DB - Not getting any PR out
  async fillPullRequest(userId: string, org: string, repo: string, bustTheCache: Boolean, getFromGit: Boolean) {
    const cacheKey = 'FillPullRequest' + userId + org + repo;
    if (bustTheCache) {
      let val = this.sqlRepository.myCache.get(cacheKey);
      if (val) {
        this.sqlRepository.myCache.del(cacheKey);
      }
    }

    if (!getFromGit) {
      let result = this.sqlRepository.myCache.get(cacheKey);
      if (result) {
        return result;
      }
      result = await this.sqlRepository.getPR4Repo(org, repo);
      if (result) {
        return result;
      } else {
        await this.getPullRequestFromGit(userId, org, repo).catch(ex => {
          console.log(`[E] fillPullRequest ${ex}`);
        });
      }
    } else {
      //Lets go to git
      await this.getPullRequestFromGit(userId, org, repo).catch(ex => {
        console.log(`[E] fillPullRequest ${ex}`);
      });
    }
  }

  // This functions fills the Dev names for the git Org, but no one care the return value
  //of this function.
  async getDevsFromGit(userId: string, org: any, endCursor = '') {
    let graphQL = '';
    //url:"https://github.com/ncats" name: "National Center ..."
    //we need to get this name in the url
    const orgName = org.url.substr(org.url.lastIndexOf('/') + 1);
    if (endCursor) {
      graphQL = `{\"query\":\"query {  organization(login:\\"${orgName}\\") {  name  membersWithRole(first: 100 , after: \\"` + endCursor + `\\") { nodes { name login  email avatarUrl  } pageInfo { endCursor  hasNextPage }}}}\",\"variables\":{}}`;
    } else {
      graphQL = `{\"query\":\"query {  organization(login: \\"${orgName}\\") {  name  membersWithRole(first: 100) { nodes { name login  email  avatarUrl  } pageInfo { endCursor  hasNextPage }}}}\",\"variables\":{}}`;
    }
    try {
      request(await this.makeGitRequestHeader(userId, graphQL), async (error: any, response: any, body: any) => {
        if (response.statusCode === 400) {
          console.log(`getDevsFromGit: No Devs found for org: ${orgName} - ${response.body}`);
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.sqlRepository.saveStatus(userId, 'GET-DEV-FAIL', `${orgName} - ${response.body}`);
          return;
        }
        if (response.statusCode === 200) {
          const result = JSON.parse(body);
          if (!result.data) {
            console.log(`getDevsFromGit: No Devs found for org: ${orgName}`);
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.sqlRepository.saveStatus(userId, 'GET-DEV-FAIL', `${orgName}`);
          } else {
            // console.log(`getDevsFromGit: ${result.data.organization.membersWithRole.nodes.length} dev found for org: ${orgName}`);
            await this.sqlRepository.saveDevs(orgName, result.data.organization.membersWithRole.nodes);
            await this.sqlRepository.saveStatus(userId, 'GET-DEV-SUCCESS', `${result.data.organization.membersWithRole.nodes.length} Devs updated for ${orgName}`);
            if (result.data.organization.membersWithRole.pageInfo) {
              const pageInfo = result.data.organization.membersWithRole.pageInfo;
              if (pageInfo.hasNextPage) {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                this.getDevsFromGit(userId, org, pageInfo.endCursor); //Recursive call
              }
            }
          }
        } else {
          console.log(`
             org - ${orgName} - ${body}`);
        }
      });
    } catch (ex) {
      console.log(ex);
    }
  }

  //Get Repos from Git and Saves in SQL
  private async getRepoFromGit(userId: string, org: string, endCursor = '') {
    let graphQL = '';
    if (endCursor) {
      graphQL = `{\"query\":\"query {  organization(login: \\"` + org + `\\") { repositories(first: 100 , after: \\"` + endCursor + `\\") {      nodes {id  name  isDisabled isArchived description homepageUrl createdAt } pageInfo { endCursor hasNextPage  } }  }}\",\"variables\":{}}`;
    } else {
      graphQL = `{\"query\":\"query {  organization(login: \\"` + org + `\\") { repositories(first: 100 ) {      nodes {id  name  isDisabled isArchived description homepageUrl createdAt } pageInfo { endCursor hasNextPage  } }  }}\",\"variables\":{}}`;
    }
    try {
      request(
        await this.makeGitRequestHeader(userId, graphQL),

        async (error: any, response: any, body: any) => {
          if (response.statusCode === 200) {
            const result = JSON.parse(body);
            if (!result.data) {
              console.log('[E] No repo found for org:' + org);
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              this.sqlRepository.saveStatus(userId, 'GET-REPO-SUCCESS-' + org.substr(0, 20), 'No repo found for org:' + org);
            } else {
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              this.sqlRepository.saveStatus(userId, 'GET-REPO-SUCCESS-' + org.substr(0, 20), `${result.data.organization.repositories.nodes.length} repo found for org: ${org}`);
              //  console.log(`[I] ${result.data.organization.repositories.nodes.length} repo found for org: ${org}`);
              await this.sqlRepository.saveRepo(org, result.data.organization.repositories.nodes);
              const pageInfo = result.data.organization.repositories.pageInfo;
              if (pageInfo.hasNextPage) {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                this.getRepoFromGit(userId, org, pageInfo.endCursor); // Recursive call
              }
            }
          } else {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.sqlRepository.saveStatus(userId, 'GET-REPO-FAIL-' + org.substr(0, 20), `response status code: ${response.statusCode}`);
            console.log('[E] GetRpoFromGit: org - ' + org + ' - ' + body);
          }
        },
      );
      //git call has put the org in SQL, now lets get it from (cache).
      return await this.sqlRepository.getRepo(org, false);
    } catch (ex) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.sqlRepository.saveStatus(userId, 'GET-REPO-FAIL-' + org.substr(0, 20), ex);
      console.log('==> getRepoFromGit: Error-' + ex);
    }
  }

  //call this method, as getRepoFromGit is recursive and stores the data in SQL
  //This method collects everything in one shot
  async getRepos(userId: string, org: string, bustTheCache: Boolean = false, getFromGit: Boolean = false) {
    const cacheKey = 'GetRepos' + userId + org;
    if (bustTheCache) {
      this.sqlRepository.myCache.del(cacheKey);
    }

    if (getFromGit) {
      return this.getRepoFromGit(userId, org);
    } else {
      //Get from local store
      let result = this.sqlRepository.myCache.get(cacheKey);
      if (result) {
        return result;
      }
      result = await this.sqlRepository.getRepo(org);
      if (result[0]) {
        this.sqlRepository.myCache.set(cacheKey, result);
        return result;
      } else {
        return this.getRepoFromGit(userId, org);
      }
    }
  }

  async makeGitRequestHeader(userId: string, graphQL: string = '', gUri = 'https://api.github.com/graphql', method = 'POST') {
    try {
      const token = 'Bearer ' + (await this.sqlRepository.getToken4User(Number(userId)));
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
    } catch (ex) {
      console.log('makeGitRequestHeader: ' + ex + ' userId: ' + userId);
    }
  }

  async makeGitRequestHeaderLight(userId: string) {
    try {
      const token = 'Bearer ' + (await this.sqlRepository.getToken4User(Number(userId)));
      const header = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
          Accept: 'application/vnd.github.machine-man-preview+json',
          'cache-control': 'no-cache',
          'user-agent': 'Gator',
        },
      };
      return header.headers;
    } catch (ex) {
      console.log('makeGitRequestHeaderLight: ' + ex + ' userId: ' + userId);
    }
  }

  /*
  returns:
  
    404 - Cannot install the hook
    422 - Already hook present
    201 - Hook installed successfully
  */
  async setupWebHook(userId: string, org: string) {
    //Lets go to git
    let result: any;

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
      await request(await this.makeGitRequestHeader(userId, graphQL, 'https://api.github.com/orgs/' + org + '/hooks'), (error: any, response: any, body: any) => {
        if (response.statusCode === 201) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          this.sqlRepository.saveStatus(userId, 'SET-HOOK-SUCCESS-' + org.substr(0, 20), ' ');
          console.log('Successfully hook is setup');
        } else {
          if (response.statusCode === 422) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.sqlRepository.saveStatus(userId, 'SET-HOOK-FAIL-' + org.substr(0, 20), `response status: ${response.statusCode}`);
            console.log('==> Warning: Hook already existing: ' + response.statusCode);
          }
        }
        result = response.statusCode;
        return result;
        //Another excption happen after this from git call. hence this wrap of try - catch
        //see up there are two awaits. and git exception is about hook already present
      });
    } catch (ex) {
      console.log('[E] setupWebHook' + ex);
      return result;
    }
  }

  async UpdateDev4Org(userId: string, orgs: string[]) {
    for (const o of orgs) {
      await this.getDevsFromGit(userId, o);
    }
  }

  /* This should be the model function for how to call git queries 
  Promise wrapper await etc
  */

  //Get the org list from the git and then calls updatedev4Org to update dev names in the DB for each org
  //Save the org in DB and then return org list reading from table
  // [{"Org":"LabShare","DisplayName":"LabShare",OrgType: git ot Org},

  async getOrgFromGit(userId: string, org: string, getFromGit: Boolean = false) {
    //Lets go to git
    const graphQL = `{\"query\": \"query { viewer {name organizations(last: 100) { nodes { name url }} }}\",\"variables\":{}}`;
    /* Without this promise wrap this code will not work */
    const gitReq = await this.makeGitRequestHeader(userId, graphQL);
    return new Promise((resolve, reject) => {
      try {
        request(gitReq, async (error: any, response: any, body: any) => {
          if (response) {
            if (response.statusCode === 200) {
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              this.sqlRepository.saveStatus(userId, 'GET-ORG-SUCCESS');
              try {
                const gitOrgs: string[] = JSON.parse(response.body).data.viewer.organizations.nodes;
                await this.sqlRepository.saveOrgLinks(org, gitOrgs);
                // await this.UpdateDev4Org(userId, orgs);
                // const result = await this.sqlRepository.getOrg4UserId(userId);
                resolve(gitOrgs);
              } catch (ex) {
                console.log(`[E] getOrgFromGit - ${ex} `);
              }
            } else {
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              this.sqlRepository.saveStatus(userId, 'GET-ORG-FAIL', `status: ${response.statusCode}`);
              console.log('getOrgFromGit: error: ' + response.statusCode);
              console.log('getOrgFromGit: error: ' + body);
              reject(null);
            }
          } else {
            console.log(`getOrgFromGit no results returned:  ${error}`);
            reject(error);
          }
        });
      } catch (ex) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.sqlRepository.saveStatus(userId, 'GET-ORG-FAIL', ex);
        console.log('getOrgFromGit' + ex);
        reject();
      }
    }).catch(ex => {
      console.log(`getOrgFromGit:  ${ex}`);
    });
  }

  async getGitHygiene(userId: string, org: string): Promise<any> {
    const rp = require('request-promise');
    const yaml = require('js-yaml');
    const fs = require('fs');
    const getUrlFile = (repo: any, file: any) => `https://api.github.com/repos/${org}/${repo}/contents/${file}`;
    const getUrlReposAtPage = (page: number) => `https://api.github.com/orgs/${org}/repos?page=${page}&per_page=10`;
    const getUrlProtection = (repo: any, branch: string) => `https://api.github.com/repos/${org}/${repo}/branches/${branch}/protection`;

    const checkFile = async (repo: any, file: string) => {
      const options = {url: getUrlFile(repo, file), headers: await this.makeGitRequestHeaderLight(userId)};
      try {
        await rp.get(options);
        return true;
      } catch (e) {
        return false;
      }
    };

    const getFile = async (repo: any, file: string) => {
      const options = {url: getUrlFile(repo, file), headers: await this.makeGitRequestHeaderLight(userId)};
      let res;
      try {
        res = await rp.get(options);
        const parsed = JSON.parse(res);
        const content64 = parsed.content;
        const text = Buffer.from(content64, 'base64').toString('ascii');
        return text;
      } catch (e) {
        return false;
      }
    };

    const checkBranchRules = async (name: any) => {
      const url = getUrlProtection(name, 'master');
      const options = {url: url, headers: await this.makeGitRequestHeaderLight(userId)};
      try {
        const res = await rp.get(options);
        return true;
      } catch (e) {
        const message = e.error;
        if (e.statusCode === 404 && message === 'Branch not protected') {
          return false;
        } else {
          return true;
        }
      }
    };

    const contains = (a: any[], b: string | any[]) => Array.isArray(a) && a.some(e => b.indexOf(e) > -1);

    const repos = await this.getRepos(userId, org, false, false);
    const names2 = await repos.map((x: any) => {
      return x.RepoName;
    });
    console.log('Total repos:', repos.length);
    const names = names2.slice(1, 5); //REMOVE AFTER TESTING
    names.sort(function(a: any, b: any) {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });
    const result: any = {};

    for (const [index, name] of names.entries()) {
      // result.push(name);
      result[name] = [];
      let packageJson: string | false;
      let travis;
      [result[name]['hasCodeOwners'], result[name]['hasBranchProtection'], travis, packageJson] = await Promise.all([checkFile(name, 'CODEOWNERS'), checkBranchRules(name), getFile(name, '.travis.yml'), getFile(name, 'package.json')]);

      result[name]['hasPackageJson'] = false;
      result[name]['hasScripts'] = false;
      result[name]['hasScriptLint'] = 'n/a';
      result[name]['hasScriptPrettier'] = 'n/a';
      result[name]['hasScriptEslint'] = 'n/a';
      result[name]['hasScriptTslint'] = 'n/a';
      result[name]['hasScriptTests'] = 'n/a';
      result[name]['hasScriptCommitLint'] = 'n/a';
      result[name]['hasTravis'] = false;
      result[name]['hasTravisTest'] = 'n/a';
      result[name]['hasTravisCoverage'] = 'n/a';
      result[name]['hasTravisLint'] = 'n/a';
      result[name]['hasTravisCodecov'] = 'n/a';

      if (packageJson) {
        const json = JSON.parse(packageJson);
        result[name]['hasPackageJson'] = true;

        if (typeof json.scripts === 'object') {
          result[name]['hasScripts'] = true;
          result[name]['hasScriptLint'] = !!json.scripts.lint;
          result[name]['hasScriptPrettier'] = !!json.scripts.prettier;
          result[name]['hasScriptEslint'] = !!json.scripts.eslint;
          result[name]['hasScriptTslint'] = !!json.scripts.tslint;
          result[name]['hasScriptTests'] = !!json.scripts.test;
          result[name]['hasScriptCommitLint'] = !!json.scripts.commitmsg;
        }
      }

      if (travis) {
        result[name]['hasTravis'] = true;
        try {
          const yml = yaml.load(travis);
          console.log(`'travis => processing ${name}`);
          result[name]['hasTravisTest'] = () => {
            try {
              contains(yml.install, ['xvfb-run npm test', 'npm run test', 'ng test']) || contains(yml.script, ['xvfb-run npm test', 'npm run test', 'ng test']);
            } catch (ex) {
              return false;
            }
          };
          result[name]['hasTravisCoverage'] = () => {
            try {
              contains(yml.install, ['xvfb-run npm run coverage', 'npm run coverage']) || contains(yml.script, ['xvfb-run npm run coverage', 'npm run coverage']);
            } catch (ex) {
              return false;
            }
          };
          result[name]['hasTravisLint'] = () => {
            try {
              contains(yml.install, ['xvfb-run npm lint', 'npm run lint', 'ng lint']) || contains(yml.script, ['xvfb-run npm lint', 'npm run lint', 'ng lint']);
            } catch (ex) {
              return false;
            }
          };
          result[name]['hasTravisCodecov'] = () => {
            try {
              contains(yml.script, ['codecov']);
            } catch (ex) {
              return false;
            }
          };
        } catch (ex) {
          console.log(ex.message);
          result[name]['hasTravisTest'] = false;
          result[name]['hasTravisCoverage'] = false;
          result[name]['hasTravisLint'] = false;
          result[name]['hasTravisCodecov'] = false;
        }
      }
    }

    const rows: any = [];
    const rowNames = Object.keys(result[names[0]]);
    /*
    result => 
      Object {banking: Array(0), IMOD: Array(0), line-crush-backend: Array(0), X: Array(0)}
      banking:Array(0) [, …]
        hasBranchProtection:true
        hasCodeOwners:true
        hasPackageJson:true
        hasScriptCommitLint:false
        hasScriptEslint:false
        hasScriptLint:true
        hasScriptPrettier:false
        hasScripts:true
        hasScriptTests:true
        hasScriptTslint:false
        hasTravis:false
        hasTravisCodecov:"n/a"
        hasTravisCoverage:"n/a"
        hasTravisLint:"n/a"
        hasTravisTest:"n/a"
        length:0
    */
    rowNames.forEach((n, index) => {
      rows[index] = [n];
      names.forEach((repo: string | number) => {
        let val = '';
        if (result[repo][n] === true) {
          val = 'Y';
        }
        if (result[repo][n] === false) {
          val = 'N';
        }
        rows[index].push(val);
      });
    });
    rows.unshift(names);
    rows[0].unshift('Repo');
    return rows;
  }
}

export {GitRepository};
