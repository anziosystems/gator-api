import * as _ from 'lodash';
import {isNullOrUndefined} from 'util';
const NodeCache = require('node-cache');
const request = require('request-promise');
import {SQLRepository} from './sqlRepository';

class JiraRepository {
  httpOptions: any;
  url: string;
  sqlRepository: SQLRepository;
  constructor() {
    this.sqlRepository = new SQLRepository(null);
  }

  //returns the first org id
  async getJiraOrg(jiraTenantId: string, bustTheCache: boolean = false) {
    return await this.sqlRepository.getJiraOrg(jiraTenantId);
  }

  //return all the org details
  async getJiraOrgs(jiraTenantId: string, bustTheCache: boolean = false) {
    return await this.sqlRepository.getJiraOrgs(jiraTenantId);
  }

  async GetJiraUsers(jiraTenantId: string, org: string = '0e493c98-6102-463a-bc17-4980be22651b', bustTheCache: boolean = false) {
    // const org = '0e493c98-6102-463a-bc17-4980be22651b'; //await this.sqlRepository.getJiraResourceId (Number(jiraTenantId));
    const uri = org + '/rest/api/3/users/search?maxResults=500';

    try {
      request(await this.makeJiraRequest(jiraTenantId, uri), async (error: any, response: any, body: any) => {
        if (response.statusCode === 200) {
          let result = JSON.parse(body);
          if (!result) {
            console.log(`GetJiraUsers: No Devs found for tenant:${jiraTenantId} ResourceId: ${org}`);
          } else {
            return await this.sqlRepository.saveJiraDevs(jiraTenantId, org, result);
            //No paging for now - Getting all 500 developers
          }
        } else {
          console.log(`GetJiraUsers - status code: ${response.statusCode} tenant:${jiraTenantId} ResourceId: ${org}`);
        }
      });
      //git call has put the org in SQL, now lets get it from (cache).
      // return await this.sqlRepository.getDevs(tenantId, org);
    } catch (ex) {
      console.log(` ==> GetJiraUsers: ${ex}`);
    }
  }

  /*
    return before the await request is important to have unit test pass.
    
  */
  async getJiraIssues(jiraTenantId: string, org: string = '0e493c98-6102-463a-bc17-4980be22651b', userId: string, status: string = '"In Progress" OR status="To Do"', fields: string = 'summary, status', bustTheCache: boolean = false): Promise<any> {
    // const org = '0e493c98-6102-463a-bc17-4980be22651b'; //await this.sqlRepository.getJiraResourceId (Number(jiraTenantId));
    const uri = `${org}/rest/api/3/search?jql=assignee =${userId} AND ( status = ${status})&fields=${fields}`;
    try {
      return await request(await this.makeJiraRequest(jiraTenantId, uri),  (error: any, response: any, body: any) => {
        if (response.statusCode === 200) {
          let result = JSON.parse(body);
          if (!result) {
            console.log(`GetJiraIssues: No issues found for tenant:${jiraTenantId} ResourceId: ${org}`);
            return result;
          } else {
            console.log(` ==> getJiraIssues: ${result.issues.length} issues found!`);
            return result.issues;
            // return await this.sqlRepository.saveJiraIssues(jiraTenantId, org, result);
            //No paging for now - Getting all 500 developers
          }
        } else {
          console.log(`GetJiraIssues - status code: ${response.statusCode} tenant:${jiraTenantId} ResourceId: ${org}`);
        }
      });
      //git call has put the org in SQL, now lets get it from (cache).
      // return await this.sqlRepository.getDevs(tenantId, org);
    } catch (ex) {
      console.log(` ==> GetJiraIssues: ${ex}`);
    }
  }

  //Get the token for the tenant and attaches to the call.
  async makeJiraRequest(jiraTenantId: string, gUri: string, body: string = '', method: string = 'GET') {
    try {
      const token = 'Bearer ' + (await this.sqlRepository.getJiraToken(Number(jiraTenantId)));
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
    } catch (ex) {
      console.log(`==> MakeJiraRequest: Error: ${ex} - tenantId: ${jiraTenantId}`);
    }
  }
}

export {JiraRepository};
