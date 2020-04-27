/* eslint-disable no-unused-vars */
/* eslint-disable no-useless-escape */

//Explore Auth API - https://a-ci.labshare.org/_api/auth/explorer/

import * as _ from 'lodash';
import {SQLRepository, GUser} from './sqlRepository';
// eslint-disable-next-line no-unused-vars
import {rejects} from 'assert';
import {promisify} from 'util';
const req = require('request');
const request = require('request-promise');

//if ever have async issues use requestAsync
//usage: await requestAsync
const requestAsync = promisify(require('request-promise'));

interface IProcessFunction<P> {
  (_error: any, response: any, body: any, item: P): any;
}

class LSAuthRepository {
  httpOptions: any;
  url: string;
  sqlRepository: SQLRepository;

  constructor() {
    this.sqlRepository = new SQLRepository(null);
  }

  async makeLSAuthRequestHeader(userId: string, gUri: string, body: string = '', method: string = 'GET') {
    try {
      if (!gUri) {
        console.log('[E] makeLSAuthRequestHeader uri cannot be empty');
        return null;
      }

      const token = 'Bearer ' + (await this.sqlRepository.getToken4User(Number(userId)));
      let header: any = {
        method: method,
        uri: `https://a.labshare.org/_api/auth/${gUri}`,
        headers: {
          Authorization: token,
          Accept: '*/*',
          'cache-control': 'no-cache',
          'user-agent': 'GitGator',
          'Accept-Encoding': 'gzip, deflate, br',
          'Content-Type': 'application/json',
        },
        // body: body,
      };

      if (method === 'POST') {
        header.json = true;
        header.body = body;
        //header['Content-Type'] = 'application/json';
      }
      return header;
    } catch (ex) {
      console.log('makeLSAuthRequestHeader: ' + ex + ' userId: ' + userId);
    }
  }

  async getTenantId(user: string, tenantName: string) {
    const reqHeader = await this.makeLSAuthRequestHeader(user, `admin/tenants`, '', 'GET');
    return new Promise((resolve, reject) => {
      request(
        reqHeader,
        async (_error: any, response: any, body: any): Promise<any> => {
          if (response.statusCode === 200) {
            let res: [any] = JSON.parse(body);
            await res.forEach(x => {
              if (x.tenantId === tenantName) {
                console.log(`Teant found for: ${tenantName}`);
                resolve(x.id);
                return;
              }
            });
          } else {
            console.log(`[E] GetTeantnId No Tenant found for: ${tenantName}`);
            reject(null);
          }
        },
      );
    });
  }

  async addUser(user: GUser) {
    let _user: any = {};
    _user.username = user.UserName; //email
    _user.displayName = user.DisplayName;
    _user.email = user.Email;
    let domain = user.UserName.split('@');

    /*
    Tenant infomation
    {
        "id": 29,
        "title": "AxleInfo",
        "description": null,
        "tenantId": "AxleInfo",
        "settings": {},
        "loginEventSettings": null,
        "tileConfig": null,
        "notification": null
    }
    */
    const tenantId = await this.getTenantId(user.Id.toString(), 'AxleInfo');
    if (!tenantId) {
      console.log(`[E] addUser - No Tenant Found.`);
      return null;
    }
    const _uri = `admin/tenants/${tenantId}/users`;
    if (domain[1] === 'axleinfo.com') {
      _user.identityIssuer = `https://sts.windows.net/{tenantid}/`;  //BUG!! in LSAuth {TenantId} string use the value not the string
    }
    if (domain[1] === `gmail.com`) {
      _user.identityIssuer = `https://accounts.google.com`; //accounts.axleinfo.com
    }

    const _reqHeader = await this.makeLSAuthRequestHeader(user.Id.toString(), _uri, _user, 'POST');
    return new Promise((resolve, reject) => {
      try {
        console.log(`calling ${_uri}`);
        console.log(_user);
        request.post(_reqHeader, async (_error: any, response: any, body: any) => {
          if (response.statusCode === 200) {
            console.log(`Woohoo - record saved`);
            resolve(200);
          } else {
            console.log(`[E] addUser statusCode: ${response.statusCode} ${response.body.error.message}`);
            resolve(response.statusCode);
          }
        });
      } catch (ex) {
        console.log(`[E] addUser ${ex}`);
        reject(ex);
      }
    });
  }
} //~LSAuthRepository

//Add to groups
//https://a.labshare.org/_api/auth/admin/tenants/29/groups/46/users/rel/8673

/*

[
    {
        "id": 45,
        "name": "admins",
        "tenantId": 29,
        "description": "Tenant administrator user group"
    },
    {
        "id": 46,
        "name": "msr-read-group",
        "tenantId": 29,
        "description": "msr group"
    },
    {
        "id": 47,
        "name": "Manage Users Group",
        "tenantId": 29,
        "description": "Members get permissions to manage users in Auth"
    }
]

*/

export {LSAuthRepository};
