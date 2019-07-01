'use strict';

const config = require('../configs/oauth2');

const hostname = (function () {
  const httpPort = config.service.httpPort;
  const httpsPort = config.service.httpsPort;
  return require('url').format({
    hostname: 'localhost',
    port: (httpPort ? httpPort : (httpsPort ? httpsPort : 80)),
    protocol: (httpPort ? 'http' : (httpsPort ? 'https' : 'http'))
  });
})();

let testParams = {
  hostname,
  user: {
    user: {
      userId: 'user',
      email: 'user@example.com',
      created: new Date(),
      validated: new Date(),
      expired: null,
      disabled: false,
      roles: {},
      password: 'test',
      name: 'Normal User',
      info: {}
    },
    admin: {
      userId: 'admin',
      email: 'admin@example.com',
      created: new Date(),
      validated: new Date(),
      expired: null,
      disabled: false,
      roles: {
        admin: true
      },
      password: 'admin',
      name: 'Administrator',
      info: {}
    },
    manager: {
      userId: 'manager',
      email: 'manager@example.com',
      created: new Date(),
      validated: new Date(),
      expired: null,
      disabled: false,
      roles: {
        manager: true
      },
      password: 'manager',
      name: 'Manager',
      info: {}
    },
    dev: {
      userId: 'dev1',
      email: 'dev@example.com',
      created: new Date(),
      validated: new Date(),
      expired: null,
      disabled: false,
      roles: {
        dev: true
      },
      password: 'dev',
      name: 'Developer',
      info: {}
    },
    dev2: {
      userId: 'dev2',
      email: 'dev2@example.com',
      created: new Date(),
      validated: new Date(),
      expired: null,
      disabled: false,
      roles: {
        dev: true
      },
      password: 'dev2',
      name: 'Developer2',
      info: {}
    },
    disabled: {
      userId: 'disabled',
      email: 'disabled@example.com',
      created: new Date(),
      validated: new Date(),
      expired: null,
      disabled: true,
      roles: {},
      password: 'disabled',
      name: 'Disabled User',
      info: {}
    }
  },
  client: {
    all: {
      id: 'clientAll',
      created: new Date(),
      clientSecret: '2',
      redirectUris: [ 'test1', 'test2' ],
      scopes: [ 'rw', 'r' ],
      grants: [
        'authorization_code',
        'password',
        'client_credentials',
        'refresh_token'
      ],
      userId: '',
      name: 'Normal Client',
      image: ''
    },
    noAuthCode: {
      id: 'clientNoAuthCode',
      created: new Date(),
      clientSecret: '3',
      redirectUris: [ 'test1', 'test2' ],
      scopes: [ 'rw', 'r' ],
      grants: [
        'password',
        'client_credentials',
        'refresh_token'
      ],
      userId: '',
      name: 'Client without authorization code',
      image: ''
    }
  },
  token: {
    udca: {
      accessToken: 'udcaA',
      accessTokenExpiresAt: (new Date(Date.now() + 3600000)),
      refreshToken: 'udcaR',
      refreshTokenExpiresAt: (new Date(Date.now() + 3600000 * 24 * 14)),
      scope: 'rw%20r'
    },
    udca2: {
      accessToken: 'udca2A',
      accessTokenExpiresAt: (new Date(Date.now() + 3600000)),
      refreshToken: 'udca2R',
      refreshTokenExpiresAt: (new Date(Date.now() + 3600000 * 24 * 14)),
      scope: 'rw%20r'
    },
    uuca: {
      accessToken: 'uucaA',
      accessTokenExpiresAt: (new Date(Date.now() + 3600000)),
      refreshToken: 'uucaR',
      refreshTokenExpiresAt: (new Date(Date.now() + 3600000 * 24 * 14)),
      scope: 'rw%20r'
    },
    uaca: {
      accessToken: 'uacaA',
      accessTokenExpiresAt: (new Date(Date.now() + 3600000)),
      refreshToken: 'uacaR',
      refreshTokenExpiresAt: (new Date(Date.now() + 3600000 * 24 * 14)),
      scope: 'rw%20r'
    },
    umca: {
      accessToken: 'umcaA',
      accessTokenExpiresAt: (new Date(Date.now() + 3600000)),
      refreshToken: 'umcaR',
      refreshTokenExpiresAt: (new Date(Date.now() + 3600000 * 24 * 14)),
      scope: 'rw%20r'
    },
    ud2ca: {
      accessToken: 'ud2caA',
      accessTokenExpiresAt: (new Date(Date.now() + 3600000)),
      refreshToken: 'ud2caR',
      refreshTokenExpiresAt: (new Date(Date.now() + 3600000 * 24 * 14)),
      scope: 'rw%20r'
    }
  },
  authCode: {
    udca: {
      code: 'udcaC',
      expiresAt: (new Date(Date.now() + 30000)),
      redirectUri: 'redirectUriUdCa',
      scope: 'rw%20r'
    }
  }
};
testParams.client.all.userId = testParams.user.dev.userId;
testParams.client.noAuthCode.userId = testParams.user.dev.userId;
testParams.token.udca.client = { id: testParams.client.all.id };
testParams.token.udca.user =
  { userId: testParams.user.dev.userId, email: testParams.user.dev.email };
testParams.token.udca2.client = { id: testParams.client.all.id };
testParams.token.udca2.user =
  { userId: testParams.user.dev.userId, email: testParams.user.dev.email };
testParams.token.uuca.client = { id: testParams.client.all.id };
testParams.token.uuca.user =
  { userId: testParams.user.user.userId, email: testParams.user.user.email };
testParams.token.uaca.client = { id: testParams.client.all.id };
testParams.token.uaca.user =
  { userId: testParams.user.admin.userId, email: testParams.user.admin.email };
testParams.token.umca.client = { id: testParams.client.all.id };
testParams.token.umca.user = { userId: testParams.user.manager.userId,
  email: testParams.user.manager.email };
testParams.token.ud2ca.client = { id: testParams.client.all.id };
testParams.token.ud2ca.user =
  { userId: testParams.user.dev2.userId, email: testParams.user.dev2.email };
testParams.authCode.udca.client = { id: testParams.client.all.id };
testParams.authCode.udca.user =
  { userId: testParams.user.dev.userId, email: testParams.user.dev.email };

testParams.client.all.redirectUris
  .push(hostname + config.oauth2.redirectUri);

module.exports = testParams;
