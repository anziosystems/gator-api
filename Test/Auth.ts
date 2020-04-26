// tslint:disable:no-any
// tslint:disable:no-invalid-this
import {expect} from 'chai';
import {SQLRepository, GUser} from '../Lib/sqlRepository';
import {LSAuthRepository} from '../Lib/LabShareRepository';

describe('GetTenant', () => {
  it('should return number', async () => {
    const LSA = new LSAuthRepository();
    await LSA.getTenantId('8584', `AxleInfo`).then(result => {
      expect(result).equals(29);
    });
  });
});

describe.only('AddUser', () => {
  it('should return number', async () => {
    const LSA = new LSAuthRepository();
    let user = new GUser();
    user.UserName = 'rafat.sarosh@anzioSystems.com';
    user.DisplayName = 'rafat sarosh';
    user.Email = 'rafat.sarosh@anziosystems.com';
    await LSA.addUser(user).then(result => {
      console.log('I am in test code ');
      expect(result).equals(200);
    });
  });
});
