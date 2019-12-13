import * as _ from 'lodash';
import {isNullOrUndefined} from 'util';
const NodeCache = require('node-cache');
const request = require('request-promise');
import {SQLRepository} from './sqlRepository';
import {timingSafeEqual} from 'crypto';
import {async} from 'rxjs/internal/scheduler/async';

class JiraRepository {
  httpOptions: any;
  url: string;
  myCache: any;
  sqlRepository: SQLRepository;
  CACHE_DURATION_SEC: number = 6000; //50 min

  constructor() {
    this.sqlRepository = new SQLRepository(null);
    if (!this.myCache) {
      this.myCache = new NodeCache({stdTTL: this.CACHE_DURATION_SEC, checkperiod: 120});
    }
  }

  //returns the first org id
  async getJiraOrg(jiraTenantId: string, bustTheCache: boolean = false) {
    return await this.sqlRepository.getJiraOrg(jiraTenantId, bustTheCache);
  }

  //return all the org details
  async getJiraOrgs(jiraTenantId: string, bustTheCache: boolean = false) {
    return await this.sqlRepository.getJiraOrgs(jiraTenantId, bustTheCache);
  }

  async getJiraUsers(jiraTenantId: string, org: string, bustTheCache: boolean = false) {
    console.log(`getJiraUsers: TenantId: ${jiraTenantId} Org: ${org}`);

    if (!bustTheCache) {
      //if bust the cache then goto Jira else get it from SQL
      const val = await this.sqlRepository.getJiraUsers(jiraTenantId, org, bustTheCache);
      if (val) return val;
    }
    // const org = '0e493c98-6102-463a-bc17-4980be22651b'; //await this.sqlRepository.getJiraResourceId (Number(jiraTenantId));
    const uri = org + '/rest/api/3/users/search?maxResults=500';

    try {
      return await request(await this.makeJiraRequest(jiraTenantId, uri), async (error: any, response: any, body: any) => {
        if (response.statusCode === 200) {
          let result = JSON.parse(body);
          if (!result) {
            // console.log(`GetJiraUsers: No Users found for tenant:${jiraTenantId} org: ${org}`);
          } else {
            await this.sqlRepository.saveJiraUsers(jiraTenantId, org, result);
            this.sqlRepository.saveStatus(jiraTenantId,'GET-JIRA-DEV-SUCCESS', ` Found ${result.length} devs for org: ${org}`);
            return await this.sqlRepository.getJiraUsers(jiraTenantId, org);
            //No paging for now - Getting all 500 developers
          }
        } else {
          // console.log(`GetJiraUsers - status code: ${response.statusCode} tenant:${jiraTenantId} org: ${org}`);
          return `"code: ${response.statusCode}, "message": "Unauthorize"`; //return 401
        }
      });
      //git call has put the org in SQL, now lets get it from (cache).
      // return await this.sqlRepository.getDevs(tenantId, org);
    } catch (ex) {
      console.log(` ==> GetJiraUsers: ${ex}`);
      if (JSON.parse(ex.error).code === 401) {
        this.sqlRepository.dropJiraTokenFromCache(jiraTenantId);
      }
      return ex.error; //a proper json {code: 401, message: "Unauthorized"}
    }
  }

  /*
    return before the await request is important to have unit test pass.
    
  */
  async getJiraIssues(jiraTenantId: string, org: string = '0e493c98-6102-463a-bc17-4980be22651b', userId: string, status: string = '"In Progress" OR status="To Do"', fields: string = 'summary, status', bustTheCache: boolean = false): Promise<any> {
    const cacheKey = `getJiraIssues:${jiraTenantId}-${org}-${userId}`;

    if (!bustTheCache) {
      let val = this.myCache.get(cacheKey);
      if (val) { 
        console.log ("Issues from cache");
        return val;
      }
    }
    // const org = '0e493c98-6102-463a-bc17-4980be22651b'; //await this.sqlRepository.getJiraResourceId (Number(jiraTenantId));
    const uri = `${org}/rest/api/3/search?jql=assignee =${userId} AND ( status = ${status})&fields=${fields}`;
    console.log(`getJiraIssues: URL= ${uri}`);
    try {
      return await request(await this.makeJiraRequest(jiraTenantId, uri), async (error: any, response: any, body: any) => {
        if (response.statusCode === 200) {
          let result = JSON.parse(body);
          if (!result) {
            console.log(`GetJiraIssues: No issues found for tenant:${jiraTenantId} OrgId: ${org}`);
            return result;
          } else {
            console.log(` ==> getJiraIssues: ${result.issues.length} issues found!`);
            if (result.issues.length > 0) this.myCache.set(cacheKey, result.issues);
            return result.issues;
            // return await this.sqlRepository.saveJiraIssues(jiraTenantId, org, result);
            //No paging for now - Getting all 500 developers
          }
        } else {
          console.log(`GetJiraIssues - status code: ${response.statusCode} tenant:${jiraTenantId} OrgId: ${org}`);
        }
      });
      //git call has put the org in SQL, now lets get it from (cache).
      // return await this.sqlRepository.getDevs(tenantId, org);
    } catch (ex) {
      console.log(` ==> GetJiraIssues: ${ex}`);
      if (JSON.parse(ex.error).code === 401) {
        this.sqlRepository.dropJiraTokenFromCache(jiraTenantId);
      }
    }
  }

  //Get the token for the tenant and attaches to the call.
  async makeJiraRequest(jiraTenantId: string, gUri: string, body: string = '', method: string = 'GET') {
    try {
      const token = 'Bearer ' + (await this.sqlRepository.getJiraToken(jiraTenantId));
      //  console.log(`==> JiraToken: ${token} `);
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
    } catch (ex) {
      console.log(`==> MakeJiraRequest: Error: ${ex} - tenantId: ${jiraTenantId}`);
    }
  }
}

export {JiraRepository};
