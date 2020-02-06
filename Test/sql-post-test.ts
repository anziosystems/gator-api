// tslint:disable:no-any
// tslint:disable:no-invalid-this
import {expect} from 'chai';
import {Context as MochaContext} from 'mocha';
import {doesNotReject} from 'assert';
import {Observable, of, Subject} from 'rxjs';
import * as jsonBadData from './data/Sample.data.json';
import {SQLRepository, Tenant} from '../Lib/sqlRepository';
import {GitRepository} from '../Lib/GitRepository';

describe('SaveTenant', () => {
  it('should return rowsAffected', async () => {
    const sqlRepositoy = new SQLRepository(null);
    const tenant = new Tenant();
    tenant.AuthToken = 'XXXX';
    tenant.RefreshToken = 'XXXX';
    tenant.UserName = 'Rafat';
    tenant.DisplayName = 'Rafat Sarosh';
    tenant.Photo = 'url for the photo';
    tenant.ProfileUrl = 'Profile';
    tenant.Id = 999;
    tenant.Email = 'rsarosh@hotmail.com';

    await sqlRepositoy.saveTenant(tenant).then(result => {
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
    await gitRepository.fillPullRequest('1040817', 'LabShare', 'forms', true, true, '').then(result => {
      expect(result.length).to.greaterThan(0);
    });
  });
});
