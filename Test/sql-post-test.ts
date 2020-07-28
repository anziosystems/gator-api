// tslint:disable:no-any
// tslint:disable:no-invalid-this
import {expect} from 'chai';
// import {Context as MochaContext} from 'mocha';
// import {doesNotReject} from 'assert';
// import {Observable, of, Subject} from 'rxjs';
// import * as jsonBadData from './data/Sample.data.json';
import * as HookData from './data/TFSHookData.json';

import {SQLRepository, GUser} from '../Lib/sqlRepository';
import {GitRepository} from '../Lib/GitRepository';

describe.only('saveRawHookData', () => {
  it('should return rowsAffected', async () => {
    const hookData: string = `{"subscriptionId":"2ec88575-f038-4cfa-85f4-039ef51d9027","notificationId":20,"id":"5518135b-8593-4342-95d5-8ecdb637eba1","eventType":"workitem.created","publisherId":"tfs","message":{"text":"Task #77 (Fix the hook URL in Documentation) created by Rafat Sarosh\r\n(https://dev.azure.com/anzio/web/wi.aspx?pcguid=b4037532-7af0-4d5a-b9ff-47e34f1f0ee0&id=77)","html":"<a href=\"https://dev.azure.com/anzio/web/wi.aspx?pcguid=b4037532-7af0-4d5a-b9ff-47e34f1f0ee0&amp;id=77\">Task #77</a> (Fix the hook URL in Documentation) created by Rafat Sarosh","markdown":"[Task #77](https://dev.azure.com/anzio/web/wi.aspx?pcguid=b4037532-7af0-4d5a-b9ff-47e34f1f0ee0&id=77) (Fix the hook URL in Documentation) created by Rafat Sarosh"},"detailedMessage":{"text":"Task #77 (Fix the hook URL in Documentation) created by Rafat Sarosh\r\n(https://dev.azure.com/anzio/web/wi.aspx?pcguid=b4037532-7af0-4d5a-b9ff-47e34f1f0ee0&id=77)\r\n\r\n- Area: gator-azure-dev-ops\r\n- Iteration: gator-azure-dev-ops\\Sprint 1\r\n- State: To Do\r\n- Assigned to: Rafat Sarosh <Rafat@AnzioSystems.com>\r\n- Comment: \r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n","html":"<a href=\"https://dev.azure.com/anzio/web/wi.aspx?pcguid=b4037532-7af0-4d5a-b9ff-47e34f1f0ee0&amp;id=77\">Task #77</a> (Fix the hook URL in Documentation) created by Rafat Sarosh<ul>\r\n<li>Area: gator-azure-dev-ops</li>\r\n<li>Iteration: gator-azure-dev-ops\\Sprint 1</li>\r\n<li>State: To Do</li>\r\n<li>Assigned to: Rafat Sarosh <Rafat@AnzioSystems.com></li>\r\n<li>Comment: <div><div style=\"color:#abb2bf;background-color:#282c34;font-family:Consolas, 'Courier New', monospace;font-weight:normal;\"><div><span style=\"color:#98c379;\"></span></div></div><div style=\"color:#abb2bf;background-color:#282c34;font-family:Consolas, 'Courier New', monospace;font-weight:normal;\"><div><br></div></div></div></li></ul>","markdown":"[Task #77](https://dev.azure.com/anzio/web/wi.aspx?pcguid=b4037532-7af0-4d5a-b9ff-47e34f1f0ee0&id=77) (Fix the hook URL in Documentation) created by Rafat Sarosh\r\n\r\n* Area: gator-azure-dev-ops\r\n* Iteration: gator-azure-dev-ops\\Sprint 1\r\n* State: To Do\r\n* Assigned to: Rafat Sarosh <Rafat@AnzioSystems.com>\r\n* Comment: \r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n"},"resource":{"id":77,"rev":1,"fields":{"System.AreaPath":"gator-azure-dev-ops","System.TeamProject":"gator-azure-dev-ops","System.IterationPath":"gator-azure-dev-ops\\Sprint 1","System.WorkItemType":"Task","System.State":"To Do","System.Reason":"Added to backlog","System.AssignedTo":"Rafat Sarosh <Rafat@AnzioSystems.com>","System.CreatedDate":"2020-07-15T04:19:53.94Z","System.CreatedBy":"Rafat Sarosh <Rafat@AnzioSystems.com>","System.ChangedDate":"2020-07-15T04:19:53.94Z","System.ChangedBy":"Rafat Sarosh <Rafat@AnzioSystems.com>","System.CommentCount":1,"System.Title":"Fix the hook URL in Documentation","Microsoft.VSTS.Common.StateChangeDate":"2020-07-15T04:19:53.94Z","Microsoft.VSTS.Common.Priority":1,"System.Description":"<div><span>Update hook url for AxleInfo &nbsp;and then delete the JiraHook code <br></span><div><br></div><div>https://gator-api-ppe.azurewebsites.net/service/JiraHook<br></div><div>Should be changed to <br></div><span><a href=\"https://gator-api-ppe.azurewebsites.net/service/Hook\">https://gator-api-ppe.azurewebsites.net/service/Hook</a></span><br></div>","System.History":"<div><div style=\"color:#abb2bf;background-color:#282c34;font-family:Consolas, 'Courier New', monospace;font-weight:normal;\"><div><span style=\"color:#98c379;\"></span></div></div><div style=\"color:#abb2bf;background-color:#282c34;font-family:Consolas, 'Courier New', monospace;font-weight:normal;\"><div><br></div></div></div>"},"commentVersionRef":{"commentId":2378264,"version":1,"url":"https://dev.azure.com/anzio/a46fc05a-20f7-4e98-9383-0a390f2170eb/_apis/wit/workItems/77/comments/2378264/versions/1"},"_links":{"self":{"href":"https://dev.azure.com/anzio/a46fc05a-20f7-4e98-9383-0a390f2170eb/_apis/wit/workItems/77"},"workItemUpdates":{"href":"https://dev.azure.com/anzio/a46fc05a-20f7-4e98-9383-0a390f2170eb/_apis/wit/workItems/77/updates"},"workItemRevisions":{"href":"https://dev.azure.com/anzio/a46fc05a-20f7-4e98-9383-0a390f2170eb/_apis/wit/workItems/77/revisions"},"workItemComments":{"href":"https://dev.azure.com/anzio/a46fc05a-20f7-4e98-9383-0a390f2170eb/_apis/wit/workItems/77/comments"},"html":{"href":"https://dev.azure.com/anzio/a46fc05a-20f7-4e98-9383-0a390f2170eb/_workitems/edit/77"},"workItemType":{"href":"https://dev.azure.com/anzio/a46fc05a-20f7-4e98-9383-0a390f2170eb/_apis/wit/workItemTypes/Task"},"fields":{"href":"https://dev.azure.com/anzio/a46fc05a-20f7-4e98-9383-0a390f2170eb/_apis/wit/fields"}},"url":"https://dev.azure.com/anzio/a46fc05a-20f7-4e98-9383-0a390f2170eb/_apis/wit/workItems/77"},"resourceVersion":"1.0","resourceContainers":{"collection":{"id":"b4037532-7af0-4d5a-b9ff-47e34f1f0ee0","baseUrl":"https://dev.azure.com/anzio/"},"account":{"id":"2b2c3e9c-64ee-445d-8973-13336d2670d3","baseUrl":"https://dev.azure.com/anzio/"},"project":{"id":"a46fc05a-20f7-4e98-9383-0a390f2170eb","baseUrl":"https://dev.azure.com/anzio/"}},"createdDate":"2020-07-15T04:20:01.1101739Z"}`;
    const sqlRepositoy = new SQLRepository(null);
    // const hookData: string = HookData.toString();
    await sqlRepositoy.saveRawHookData(hookData).then(result => {
      expect(result).equals(true);
    });
  });
});

describe('saveLoggedInUser', () => {
  it('should return rowsAffected', async () => {
    const sqlRepositoy = new SQLRepository(null);
    const tenant = new GUser();
    tenant.AuthToken = 'XXXX';
    tenant.RefreshToken = 'XXXX';
    tenant.UserName = 'Rafat';
    tenant.DisplayName = 'Rafat Sarosh';
    tenant.Photo = 'url for the photo';
    tenant.ProfileUrl = 'Profile';
    tenant.Id = 999;
    tenant.Email = 'rsarosh@hotmail.com';

    await sqlRepositoy.saveLoggedInUser(tenant).then(result => {
      expect(result).to.greaterThan(0);
    });
  });
});

describe('SaveStatus', () => {
  it('should return rowsAffected', async () => {
    const sqlRepositoy = new SQLRepository(null);
    const tenantId = '1040817';
    await sqlRepositoy.saveStatus(tenantId, 'Testing', 'Message from Testing').then(result => {
      expect(result).to.greaterThan(0);
    });
  });
});

describe('SaveActiveTenant', () => {
  it('should return rowsAffected', async () => {
    const sqlRepositoy = new SQLRepository(null);
    const tenantId = 1040817;
    await sqlRepositoy.setActiveTenant(tenantId).then(result => {
      expect(result).to.greaterThan(0);
    });
  });
});

describe('FillPullRequest', () => {
  it('should return rowsAffected', async () => {
    const gitRepository = new GitRepository();
    await gitRepository.fillPullRequest('1040817', 'LabShare', 'forms', true, true).then(result => {
      expect(result.length).to.greaterThan(0);
    });
  });
});
