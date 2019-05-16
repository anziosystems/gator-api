// tslint:disable:no-any
// tslint:disable:no-invalid-this
import {expect} from 'chai';
import {Context as MochaContext} from 'mocha';
import {doesNotReject} from 'assert';
import {Observable, of, Subject} from 'rxjs';
import * as jsonBadData from './data/Sample.data.json';
import {SQLRepository, Tenant} from '../Lib/sqlRepository';
import {GitRepository} from '../Lib/GitRepository';

describe('TopDevForLastXDays', () => {
  it('should return rowsAffected', async () => {
    let sqlRepositoy = new SQLRepository(null);
    let tenant = 'LabShare';
    let day = 1;
    await sqlRepositoy.TopDevForLastXDays(tenant, day).then(result => {
      expect(result.recordset.length).to.greaterThan(0);
      console.log(result.recordset[0]);
    });
  });
});

describe('GetOrg', () => {
  it('should return rowsAffected', async () => {
    let gitRepository = new GitRepository();
    await gitRepository.GetOrg('1040817', true, true).then(result => {
      expect(result.recordset.length).to.greaterThan(0);
      console.log(result.recordset[0]);
    });
  });
});

describe('GetRepos', () => {
  it('should return rowsAffected', async () => {
    let gitRepository = new GitRepository();
    await gitRepository.GetRepos('rsarosh@hotmail.com', 'LabShare', true, true).then(result => {
      expect(result.recordset.length).to.greaterThan(0);
      console.log(result.recordset[0]);
    });
  });
});

describe('SetRepoCollection', () => {
  it('should return recordset', async () => {
    let sqlRepositoy = new SQLRepository(null);
    let org = 'LabShare';
    let tenantId = 'rsarosh@hotmail.com';
    let repos = '1,2,3,4';
    await sqlRepositoy.SetRepoCollection(tenantId, org, 'NewCollection', repos).then(result => {
      expect(result.rowsAffected.length).to.greaterThan(0);
      console.log(result.rowsAffected);
    });
  });
});

describe('GetAllRepoCollection4TenantOrg', () => {
  it('should return recordset', async () => {
    let sqlRepositoy = new SQLRepository(null);
    let org = 'LabShare';
    let tenantId = 'rsarosh@hotmail.com';

    await sqlRepositoy.GetAllRepoCollection4TenantOrg(tenantId, org, false).then(result => {
      expect(result.recordset.length).to.greaterThan(0);
      console.log(result.recordset);
    });
  });
});

describe('GetRepoCollectionByName', () => {
  it('should return recordset', async () => {
    let sqlRepositoy = new SQLRepository(null);
    await sqlRepositoy.GetRepoCollectionByName('NewCollection', false).then(result => {
      expect(result.recordset.length).to.greaterThan(0);
      console.log(result.recordset);
    });
  });
});

//SetupWebHook
describe('SetupWebHook', () => {
  it('should return a number', async () => {
    let gitRepository = new GitRepository();
    let org = 'anziosystems';
    let tenantId = 'rsarosh@hotmail.com';
    await gitRepository.SetupWebHook(tenantId, org).then(result => {
      console.log(result);
      expect(result).to.eq(1);
    });
  });
});

describe('LongestPullRequest', () => {
  it('should return recordset', async () => {
    let sqlRepositoy = new SQLRepository(null);
    let tenant = 'LabShare';
    let day = 1;
    await sqlRepositoy.LongestPullRequest(tenant, day).then(result => {
      expect(result.recordset.length).to.greaterThan(0);
      console.log(result.recordset[0]);
    });
  });
});

describe('GetTopRespositories4XDays', () => {
  it('should return recordset', async () => {
    let sqlRepositoy = new SQLRepository(null);
    let tenant = 'LabShare';
    let day = 1;
    await sqlRepositoy.GetTopRespositories4XDays(tenant, day).then(result => {
      expect(result.recordset.length).to.greaterThan(0);
      console.log(result.recordset[0]);
    });
  });
});

describe('PullRequest4Dev', () => {
  it('should return recordset', async () => {
    let sqlRepositoy = new SQLRepository(null);
    let tenant = 'LabShare';
    let day = 1;
    let login = 'artemnih';
    let state = 'closed';
    await sqlRepositoy.PullRequest4Dev(tenant, day, login, state, 10).then(result => {
      expect(result.recordset.length).to.greaterThan(0);
      console.log(result.recordset[0]);
    });
  });
});

describe('PullRequestCountForLastXDays', () => {
  it.only('should return recordset', async () => {
    let sqlRepositoy = new SQLRepository(null);
    let tenant = 'LabShare';
    let day = 30;

    await sqlRepositoy.PullRequestCountForLastXDays(tenant, day).then(result => {
      expect(result.length).to.greaterThan(0);
      console.log(result.returnValue);
    });
  });
});

describe('GetPullRequestForId', () => {
  it('should return recordset', async () => {
    let sqlRepositoy = new SQLRepository(null);
    let tenant = 'LabShare';
    let id = 113;

    await sqlRepositoy.GetPullRequestForId(tenant, id).then(result => {
      expect(result.recordset.length).to.greaterThan(0);
      console.log(result.recordset[0]);
    });
  });
});
