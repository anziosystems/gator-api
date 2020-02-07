// tslint:disable:no-any
// tslint:disable:no-invalid-this
import {expect} from 'chai';
// import {Context as MochaContext} from 'mocha';
// import {doesNotReject, AssertionError} from 'assert';
// import {Observable, of, Subject} from 'rxjs';
// import * as jsonBadData from './data/Sample.data.json';
import {SQLRepository} from '../Lib/sqlRepository';
// import {GitRepository} from '../Lib/GitRepository';
import {JiraRepository} from '../Lib/JiraRepository';
import {isNullOrUndefined} from 'util';

const jiraTenant = '557058:5ece7650-2568-429a-9548-36d4c141ed83          ';
const jiraOrg = '786d2410-0054-411f-90ed-392c8cc1aad1'; //'0e493c98-6102-463a-bc17-4980be22651b';

describe('getJiraUsers', () => {
  it('should return rowsAffected', async () => {
    const jiraRepository = new JiraRepository();
    await jiraRepository.getJiraUsers(jiraTenant, jiraOrg, true).then((result: any) => {
      expect(JSON.parse(result).length).to.greaterThan(0);
    });
  });
});

describe('getJiraOrgs', () => {
  it('should return rowsAffected', async () => {
    const sqlRepository = new SQLRepository(null);
    await sqlRepository.getJiraOrgs(jiraTenant).then((result: any) => {
      expect(result.length).to.greaterThan(0);
    });
  });
});

describe('getJiraIssues', () => {
  it('should return rowsAffected', async () => {
    const jiraRepository = new JiraRepository();
    jiraRepository
      .getJiraIssues(
        jiraTenant, //tenant
        '0e493c98-6102-463a-bc17-4980be22651b', //org
        '557058:f39310b9-d30a-41a3-8011-6a6ae5eeed07', //userId
        '"In Progress" OR status="To Do"', //status
        'summary,status, assignee,created, updated', //fields
      )
      .then(result => {
        expect(result.length).to.greaterThan(0);
      });
  });
});

describe('getJiraOrg', () => {
  it('should return an object', async () => {
    const sqlRepository = new SQLRepository(null);
    await sqlRepository.getJiraOrg(jiraTenant).then((result: any) => {
      expect(isNullOrUndefined(result)).equals(false);
      expect(result).equals('0e493c98-6102-463a-bc17-4980be22651b');
    });
  });
});
