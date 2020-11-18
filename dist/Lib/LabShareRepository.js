"use strict";
/* eslint-disable no-unused-vars */
/* eslint-disable no-useless-escape */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const sqlRepository_1 = require("./sqlRepository");
const util_1 = require("util");
const req = require('request');
const request = require('request-promise');
//if ever have async issues use requestAsync
//usage: await requestAsync
const requestAsync = util_1.promisify(require('request-promise'));
class LSAuthRepository {
    constructor() {
        this.sqlRepository = new sqlRepository_1.SQLRepository(null);
    }
    makeLSAuthRequestHeader(userId, gUri, body = '', method = 'GET') {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!gUri) {
                    console.log('[E] makeLSAuthRequestHeader uri cannot be empty');
                    return null;
                }
                const token = 'Bearer ' + (yield this.sqlRepository.getToken4User(userId));
                let header = {
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
                };
                if (method === 'POST') {
                    header.json = true;
                    header.body = body;
                    //header['Content-Type'] = 'application/json';
                }
                return header;
            }
            catch (ex) {
                console.log('makeLSAuthRequestHeader: ' + ex + ' userId: ' + userId);
            }
        });
    }
    getTenantId(user, tenantName) {
        return __awaiter(this, void 0, void 0, function* () {
            const reqHeader = yield this.makeLSAuthRequestHeader(user, `admin/tenants`, '', 'GET');
            return new Promise((resolve, reject) => {
                request(reqHeader, (_error, response, body) => __awaiter(this, void 0, void 0, function* () {
                    if (response.statusCode === 200) {
                        let res = JSON.parse(body);
                        yield res.forEach(x => {
                            if (x.tenantId === tenantName) {
                                console.log(`Teant found for: ${tenantName}`);
                                resolve(x.id);
                                return;
                            }
                        });
                    }
                    else {
                        console.log(`[E] GetTeantnId No Tenant found for: ${tenantName}`);
                        reject(null);
                    }
                }));
            });
        });
    }
    addUser(user) {
        return __awaiter(this, void 0, void 0, function* () {
            let _user = {};
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
            const tenantId = yield this.getTenantId(user.Id.toString(), 'AxleInfo');
            if (!tenantId) {
                console.log(`[E] addUser - No Tenant Found.`);
                return null;
            }
            const _uri = `admin/tenants/${tenantId}/users`;
            if (domain[1] === 'axleinfo.com') {
                _user.identityIssuer = `https://sts.windows.net/{tenantid}/`; //BUG!! in LSAuth {TenantId} string use the value not the string
            }
            if (domain[1] === `gmail.com`) {
                _user.identityIssuer = `https://accounts.google.com`; //accounts.axleinfo.com
            }
            const _reqHeader = yield this.makeLSAuthRequestHeader(user.Id.toString(), _uri, _user, 'POST');
            return new Promise((resolve, reject) => {
                try {
                    console.log(`calling ${_uri}`);
                    console.log(_user);
                    request.post(_reqHeader, (_error, response, body) => __awaiter(this, void 0, void 0, function* () {
                        if (response.statusCode === 200) {
                            console.log(`Woohoo - record saved`);
                            resolve(200);
                        }
                        else {
                            console.log(`[E] addUser statusCode: ${response.statusCode} ${response.body.error.message}`);
                            resolve(response.statusCode);
                        }
                    }));
                }
                catch (ex) {
                    console.log(`[E] addUser ${ex}`);
                    reject(ex);
                }
            });
        });
    }
} //~LSAuthRepository
exports.LSAuthRepository = LSAuthRepository;
//# sourceMappingURL=LabShareRepository.js.map