// tslint:disable:no-any
// tslint:disable:no-invalid-this
import {expect} from 'chai';
import {Context as MochaContext} from 'mocha';
import {doesNotReject, AssertionError} from 'assert';
import {Observable, of, Subject} from 'rxjs';
import * as jsonBadData from './data/Sample.data.json';
import {SQLRepository, Tenant} from '../Lib/sqlRepository';
import {GitRepository} from '../Lib/GitRepository';
import {JiraRepository} from '../Lib/JiraRepository';
import {isNullOrUndefined} from 'util';

describe('TopDevForLastXDays', () => {
  it('should return rowsAffected', async () => {
    const sqlRepositoy = new SQLRepository(null);
    const tenant = 'LabShare';
    const day = 1;
    await sqlRepositoy.getTopDev4LastXDays(tenant, day).then(result => {
      expect(result.toTable.length).to.greaterThan(0);
    });
  });
});

describe.only('GetOrg', () => {
  it('should return rowsAffected', async () => {
    const gitRepository = new GitRepository();
    await gitRepository.getOrg('1040817', true, true).then(result => {
      expect(result.toTable.length).to.greaterThan(0);
    });
  });
});

describe('GetRepos', () => {
  it('should return rowsAffected', async () => {
    const gitRepository = new GitRepository();
    await gitRepository.getRepos('1040817', 'LabShare', true, true).then(result => {
      expect(result.toTable.length).to.greaterThan(0);
    });
  });
});

describe('getDevs4Org', () => {
  it('should return rowsAffected', async () => {
    const gitRepository = new GitRepository();
    await gitRepository.getDevsFromGit('1040817', 'LabShare').then((result: any) => {
      expect(result.toTable.length).to.greaterThan(0);
    });
  });
});

// describe('SetRepoCollection', () => {
//   it('should return recordset', async () => {
//     let sqlRepositoy = new SQLRepository(null);
//     let org = 'LabShare';
//     let tenantId = '1040817';
//     let repos = '1,2,3,4';
//     await sqlRepositoy.saveRepoCollection(tenantId, org, 'NewCollection', repos).then(result => {
//       expect(result.rowsAffected.length).to.greaterThan(0);
//       console.log(result.rowsAffected);
//     });
//   });
// });

// describe('GetAllRepoCollection4TenantOrg', () => {
//   it('should return recordset', async () => {
//     let sqlRepositoy = new SQLRepository(null);
//     let org = 'LabShare';
//     let tenantId = '1040817';

//     await sqlRepositoy.getAllRepoCollection4TenantOrg(tenantId, org, false).then((result:any) => {
//       expect(result.toTable.length).to.greaterThan(0);
//     });
//   });
// });

// describe('getRepoCollectionByName', () => {
//   it('should return recordset', async () => {
//     let sqlRepositoy = new SQLRepository(null);
//     await sqlRepositoy.getRepoCollectionByName('NewCollection', false).then((result:any) => {
//       expect(result.recordset.length).to.greaterThan(0);
//       console.log(result.recordset);
//     });
//   });
// });

//SetupWebHook
describe('SetupWebHook', () => {
  it('should return a 404 - can not install the hook', async () => {
    const gitRepository = new GitRepository();
    const org = 'ncats';
    const tenantId = '1040817';
    await gitRepository.setupWebHook(tenantId, org).then(
      (result: any) => {
        console.log(result);
        expect(result).to.eq(404); //means cannot install web hook
      },
      error => {
        console.log('==>Test Error' + error);
      },
    );
  });
});

describe('SetupWebHook', () => {
  it('should return a 422 for already installed hook', async () => {
    const gitRepository = new GitRepository();
    const org = 'LabShare';
    const tenantId = '1040817';
    await gitRepository.setupWebHook(tenantId, org).then(
      (result: any) => {
        console.log(result);
        expect(result).to.eq(422); //means  web hook already installed
      },
      error => {
        console.log('==>Test Error' + error);
      },
    );
  });
});

describe('LongestPullRequest', () => {
  it('should return recordset', async () => {
    const sqlRepositoy = new SQLRepository(null);
    const tenant = '1040817';
    const day = 1;
    await sqlRepositoy.getLongestPR(tenant, day).then((result: any) => {
      expect(result.toTable.length).to.greaterThan(0);
    });
  });
});

describe('GetGraphData4XDays', () => {
  it('should return recordset', async () => {
    const sqlRepositoy = new SQLRepository(null);
    const org = 'LabShare';
    const day = 30;
    await sqlRepositoy.GetGraphData4XDays(org, day, true).then((result: any) => {
      expect(result[0].Ctr).to.greaterThan(0);
      //result[0].state = 'closed'
      //result[0].Date = "May 1 2019"
    });
  });
});

describe('GetTopRespositories4XDays', () => {
  it('should return recordset', async () => {
    const sqlRepositoy = new SQLRepository(null);
    const tenant = '1040817';
    const day = 1;
    await sqlRepositoy.getTopRepo4XDays(tenant, day).then((result: any) => {
      expect(result.toTable.length).to.greaterThan(0);
    });
  });
});

describe('PullRequest4Dev', () => {
  it('should return recordset', async () => {
    const sqlRepositoy = new SQLRepository(null);
    const tenant = '1040817';
    const day = 7;
    const login = 'artemnih';
    const state = 'closed';
    await sqlRepositoy.getPR4Dev(tenant, day, login, state, 10).then((result: any) => {
      expect(result.toTable.length).to.greaterThan(0);
      console.log(result[0]);
    });
  });
});

describe('PullRequestCountForLastXDays', () => {
  it('should return recordset', async () => {
    const sqlRepositoy = new SQLRepository(null);
    const tenant = '1040817';
    const day = 30;

    await sqlRepositoy.getPRCount4LastXDays(tenant, day).then((result: any) => {
      expect(result.toTable.length).to.greaterThan(0);
    });
  });
});

describe('GetPullRequestForId', () => {
  it('should return recordset', async () => {
    const sqlRepositoy = new SQLRepository(null);
    const tenant = '1040817';
    const id = 113;

    await sqlRepositoy.getPR4Id(tenant, id).then((result: any) => {
      expect(result.toTable.length).to.greaterThan(0);
    });
  });
});

describe('TestEncryp', () => {
  it('Both String should be same', () => {
    const sqlRepositoy = new SQLRepository(null);
    const s = '1234567890';
    const key = '1234567890';
    console.log('==>' + s);
    const encrypt = sqlRepositoy.encrypt(s, key);
    const s2 = sqlRepositoy.decrypt(encrypt, key);
    console.log('==>' + s2);
    expect(s).to.equals(s2);
  });
});
