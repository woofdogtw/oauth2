'use strict';

const _     = require('lodash');
const Ajv   = require('ajv');
const async = require('async');

const errid      = require('../../../lib/error').errid;
const testParams = require('../../test-params');

const tokenUaCa = testParams.token.uaca.accessToken;
const tokenUdCa = testParams.token.udca.accessToken;
const tokenUd2Ca = testParams.token.ud2ca.accessToken;
const tokenUuCa = testParams.token.uuca.accessToken;

let agent;
let ajv = new Ajv({
  format: 'full'
});
let clientCount;
let clientDevCount;

/**
 * Initialize request agent. Call this before all test.
 *
 * @param {Object} _agent The Express app object to be used.
 */
module.exports.init = function(_agent) {
  agent = _agent;
  clientCount = Object.keys(testParams.client).length;
  clientDevCount = Object.keys(testParams.client).length;
};

/**
 * `GET /api/client/{clientId}` with dev user.
 */
module.exports.getClientDev = function(done) {
  const c = testParams.client.all;
  agent.get(`/api/client/${c.id}`)
    .set('Authorization', `Bearer ${tokenUdCa}`)
    .expect(200).end(function(err, res) {
      if (err) {
        return void done(err);
      }
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          created: { type: 'string', format: 'date-time' },
          clientSecret: { type: 'string' },
          redirectUris: { type: 'array', items: { type: 'string' } },
          scopes: { type: [ 'array', 'null' ], items: { type: 'string' } },
          grants: { type: 'array', items: { type: 'string' } },
          name: { type: 'string' },
          image: { type: 'string' }
        },
        required: [
          'id', 'created', 'clientSecret', 'redirectUris', 'scopes', 'grants',
          'name', 'image'
        ],
        additionalProperties: false
      };
      if (!ajv.validate(schema, res.body)) {
        return void done(Error(ajv.errorsText()));
      }
      const client = res.body;
      if ((client.id !== c.id) ||
          !_.isEqual(new Date(client.created), c.created) ||
          (client.clientSecret !== c.clientSecret) ||
          !_.isEqual(client.redirectUris, c.redirectUris) ||
          !_.isEqual(client.scopes, c.scopes) ||
          !_.isEqual(client.grants, c.grants) ||
          (client.name !== c.name) || (client.image !== c.image)) {
        return void done(Error('Client information are difference'));
      }
      done(null);
    });
};

/**
 * `GET /api/client/{clientId}` with admin user.
 */
module.exports.getClientAdmin = function(done) {
  const c = testParams.client.all;
  agent.get(`/api/client/${c.id}`)
    .set('Authorization', `Bearer ${tokenUaCa}`)
    .expect(200).end(function(err, res) {
      if (err) {
        return void done(err);
      }
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          created: { type: 'string', format: 'date-time' },
          clientSecret: { type: 'string' },
          redirectUris: { type: 'array', items: { type: 'string' } },
          scopes: { type: [ 'array', 'null' ], items: { type: 'string' } },
          grants: { type: 'array', items: { type: 'string' } },
          userId: { type: 'string' },
          name: { type: 'string' },
          image: { type: 'string' }
        },
        required: [
          'id', 'created', 'clientSecret', 'redirectUris', 'scopes', 'grants',
          'userId', 'name', 'image'
        ],
        additionalProperties: false
      };
      if (!ajv.validate(schema, res.body)) {
        return void done(Error(ajv.errorsText()));
      }
      const client = res.body;
      if ((client.id !== c.id) ||
          !_.isEqual(new Date(client.created), c.created) ||
          (client.clientSecret !== c.clientSecret) ||
          !_.isEqual(client.redirectUris, c.redirectUris) ||
          !_.isEqual(client.scopes, c.scopes) ||
          !_.isEqual(client.grants, c.grants) ||
          (client.userId !== c.userId) || (client.name !== c.name) ||
          (client.image !== c.image)) {
        return void done(Error('Client information are difference'));
      }
      done(null);
    });
};

/**
 * `GET /api/client/{clientId}` with wrong dev user.
 */
module.exports.getClientDevWrong = function(done) {
  agent.get(`/api/client/${testParams.client.all.id}`)
    .set('Authorization', `Bearer ${tokenUd2Ca}`)
    .expect(404).end(function(err, res) {
      if (err) {
        return void done(err);
      } else if (res.body.code !== errid.ECLIENT_NOT_FOUND.obj.code) {
        return void done(Error('Should respond ECLIENT_NOT_FOUND error code'));
      }
      done(null);
    });
};

/**
 * `GET /api/client/{clientId}` with wrong client ID.
 */
module.exports.getClientWrong = function(done) {
  agent.get(`/api/client/${testParams.client.all.id}1`)
    .set('Authorization', `Bearer ${tokenUaCa}`)
    .expect(404).end(function(err, res) {
      if (err) {
        return void done(err);
      } else if (res.body.code !== errid.ECLIENT_NOT_FOUND.obj.code) {
        return void done(Error('Should respond ECLIENT_NOT_FOUND error code'));
      }
      done(null);
    });
};

/**
 * `GET /api/client/{clientId}` using invalid user.
 */
module.exports.getClientInvalidPerm = function(done) {
  agent.get(`/api/client/${testParams.client.all.id}`)
    .set('Authorization', `Bearer ${tokenUuCa}`)
    .expect(403).end(function(err, res) {
      if (err) {
        return void done(err);
      } else if (res.body.code !== errid.EPERM.obj.code) {
        return void done(Error('Should respond EPERM error code'));
      }
      done(null);
    });
};

/**
 * `POST /api/client` by dev user.
 */
module.exports.postClientDev = function(done) {
  const newClientInfo = {
    redirectUris: [ 'test1', 'test2' ],
    scopes: [ 'rw' ],
    grants: [
      'authorization_code',
      'password',
      'client_credentials',
      'refresh_token'
    ],
    name: 'New Dev Client',
    image: 'http://example.com/image.png'
  };

  async.waterfall([
    // Add a client.
    function(cb) {
      agent.post('/api/client')
        .set('Authorization', `Bearer ${tokenUdCa}`)
        .send(newClientInfo).expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (!res.body.clientId ||
              (typeof(res.body.clientId) !== 'string')) {
            return void cb(Error('Must respond clientId'));
          } else if (Object.keys(res.body).length > 1) {
            return void cb(Error('Should have only one clientId key'));
          }
          cb(null, res.body.clientId);
        });
    },
    // Check if the client is inserted correctly.
    function(clientId, cb) {
      agent.get(`/api/client/${clientId}`)
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.id !== clientId) {
            return void cb(Error('Cannot get the new client'));
          }
          const client = res.body;
          if (isNaN((new Date(client.created)).getTime()) ||
              !_.isEqual(client.redirectUris, newClientInfo.redirectUris) ||
              !_.isEqual(client.scopes, newClientInfo.scopes) ||
              !_.isEqual(client.grants, newClientInfo.grants) ||
              (client.name !== newClientInfo.name) ||
              (client.image !== newClientInfo.image)) {
            return void cb(Error('Client content is not the same as inserted'));
          }
          cb(null);
        });
    }
  ], function(err) {
    if (!err) {
      clientCount++;
      clientDevCount++;
    }
    done(err);
  });
};

/**
 * `POST /api/client` by admin user.
 */
module.exports.postClientAdmin = function(done) {
  const newClientInfo = {
    redirectUris: [ 'test1', 'test2' ],
    scopes: [ 'rw' ],
    grants: [
      'authorization_code',
      'password',
      'client_credentials',
      'refresh_token'
    ],
    userId: testParams.user.dev2.userId,
    name: 'New Dev Client by admin',
    image: 'http://example.com/image.png'
  };

  async.waterfall([
    // Add a client.
    function(cb) {
      agent.post('/api/client')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send(newClientInfo).expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (!res.body.clientId ||
              (typeof(res.body.clientId) !== 'string')) {
            return void cb(Error('Must respond clientId'));
          } else if (Object.keys(res.body).length > 1) {
            return void cb(Error('Should have only one clientId key'));
          }
          cb(null, res.body.clientId);
        });
    },
    // Check if the client is inserted correctly.
    function(clientId, cb) {
      agent.get(`/api/client/${clientId}`)
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.id !== clientId) {
            return void cb(Error('Cannot get the new client'));
          }
          const client = res.body;
          if ((client.id !== clientId) ||
              isNaN((new Date(client.created)).getTime()) ||
              !_.isEqual(client.redirectUris, newClientInfo.redirectUris) ||
              !_.isEqual(client.scopes, newClientInfo.scopes) ||
              !_.isEqual(client.grants, newClientInfo.grants) ||
              (client.userId !== newClientInfo.userId) ||
              (client.name !== newClientInfo.name) ||
              (client.image !== newClientInfo.image)) {
            return void cb(Error('Client content is not the same as inserted'));
          }
          cb(null);
        });
    }
  ], function(err) {
    if (!err) {
      clientCount++;
    }
    done(err);
  });
};

/**
 * `POST /api/client` with invalid parameters.
 */
module.exports.postClientInvalid = function(done) {
  const newClientStr = JSON.stringify({
    redirectUris: [ 'test1', 'test2' ],
    scopes: [ 'rw' ],
    grants: [
      'authorization_code',
      'password',
      'client_credentials',
      'refresh_token'
    ],
    userId: testParams.user.dev.userId,
    name: 'New Dev Client by admin',
    image: 'http://example.com/image.png'
  });

  async.waterfall([
    // Send invalid redirectUris.
    function(cb) {
      let newClient = JSON.parse(newClientStr);
      newClient.redirectUris = [ '' ];
      agent.post('/api/client')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send(newClient).expect(400).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('redirectUris') < 0) {
            return void cb(Error('Should respond redirectUris error message'));
          }
          cb(null);
        });
    },
    // Send invalid scopes.
    function(cb) {
      let newClient = JSON.parse(newClientStr);
      newClient.scopes = [ '' ];
      agent.post('/api/client')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send(newClient).expect(400).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('scopes') < 0) {
            return void cb(Error('Should respond scopes error message'));
          }
          cb(null);
        });
    },
    // Send invalid grants.
    function(cb) {
      let newClient = JSON.parse(newClientStr);
      newClient.grants = [ '' ];
      agent.post('/api/client')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send(newClient).expect(400).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('grants') < 0) {
            return void cb(Error('Should respond grants error message'));
          }
          cb(null);
        });
    },
    // Send invalid userId.
    function(cb) {
      let newClient = JSON.parse(newClientStr);
      newClient.userId = 1;
      agent.post('/api/client')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send(newClient).expect(400).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('userId') < 0) {
            return void cb(Error('Should respond userId error message'));
          }
          cb(null);
        });
    },
    // Send invalid name.
    function(cb) {
      let newClient = JSON.parse(newClientStr);
      newClient.name = 1;
      agent.post('/api/client')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send(newClient).expect(400).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('name') < 0) {
            return void cb(Error('Should respond name error message'));
          }
          cb(null);
        });
    },
    // Send invalid image.
    function(cb) {
      let newClient = JSON.parse(newClientStr);
      newClient.image = 1;
      agent.post('/api/client')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send(newClient).expect(400).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('image') < 0) {
            return void cb(Error('Should respond image error message'));
          }
          cb(null);
        });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * `POST /api/client` with invalid client.
 */
module.exports.postClientInvalidPerm = function(done) {
  agent.post('/api/client')
    .set('Authorization', `Bearer ${tokenUuCa}`)
    .send({}).expect(403).end(function(err, res) {
      if (err) {
        return void done(err);
      } else if (res.body.code !== errid.EPERM.obj.code) {
        return void done(Error('Should respond EPERM error code'));
      }
      done(null);
    });
};

/**
 * `DELETE /api/client/{clientId}` with dev user.
 */
module.exports.deleteClientDev = function(done) {
  const newClientInfo = {
    redirectUris: [ 'test1', 'test2' ],
    scopes: [ 'rw' ],
    grants: [
      'authorization_code',
      'password',
      'client_credentials',
      'refresh_token'
    ],
    userId: testParams.user.dev.userId,
    name: 'Remove Client Dev',
    image: 'http://example.com/image.png'
  };

  async.waterfall([
    // Add a client.
    function(cb) {
      agent.post('/api/client')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send(newClientInfo).expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          cb(null, res.body.clientId);
        });
    },
    // Remove the client.
    function(clientId, cb) {
      agent.delete(`/api/client/${clientId}`)
        .set('Authorization', `Bearer ${tokenUdCa}`)
        .expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          cb(null, clientId);
        });
    },
    // Check if the client is removed.
    function(clientId, cb) {
      agent.get(`/api/client/${clientId}`)
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .expect(404).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.ECLIENT_NOT_FOUND.obj.code) {
            return void cb(
              Error('Should respond ECLIENT_NOT_FOUND error code'));
          }
          cb(null);
        });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * `DELETE /api/client/{clientId}` with wrong dev user.
 */
module.exports.deleteClientDevWrong = function(done) {
  async.waterfall([
    // Remove the client.
    function(cb) {
      agent.delete(`/api/client/${testParams.client.all.id}`)
        .set('Authorization', `Bearer ${tokenUd2Ca}`)
        .expect(404).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.ECLIENT_NOT_FOUND.obj.code) {
            return void cb(
              Error('Should respond ECLIENT_NOT_FOUND error code'));
          }
          cb(null);
        });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * `DELETE /api/client/{clientId}` with non-exist client ID.
 */
module.exports.deleteClientNotExist = function(done) {
  async.waterfall([
    // Remove the client.
    function(cb) {
      agent.delete(`/api/client/${testParams.client.all.id}1`)
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .expect(404).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.ECLIENT_NOT_FOUND.obj.code) {
            return void cb(
              Error('Should respond ECLIENT_NOT_FOUND error code'));
          }
          cb(null);
        });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * `DELETE /api/client/{clientId}` with invalid user.
 */
module.exports.deleteClientInvalidPerm = function(done) {
  async.waterfall([
    // Remove the client.
    function(cb) {
      agent.delete(`/api/client/${testParams.client.all.id}`)
        .set('Authorization', `Bearer ${tokenUuCa}`)
        .expect(403).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.EPERM.obj.code) {
            return void cb(
              Error('Should respond EPERM error code'));
          }
          cb(null);
        });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * `PUT /api/client/{clientId}` with dev user.
 */
module.exports.putClientDev = function(done) {
  const newClientInfo = {
    redirectUris: [ 'test1', 'test2' ],
    scopes: [ 'rw' ],
    grants: [
      'authorization_code',
      'password',
      'client_credentials',
      'refresh_token'
    ],
    userId: testParams.user.dev.userId,
    name: 'Update Client',
    image: 'http://example.com/image.png'
  };
  const updates = {
    clientSecret: 'test',
    redirectUris: [],
    scopes: [],
    name: 'Updated Client',
    image: 'http://example.com/image2.png'
  };

  async.waterfall([
    // Add a client.
    function(cb) {
      agent.post('/api/client')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send(newClientInfo).expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          cb(null, res.body.clientId);
        });
    },
    // Update the client.
    function(clientId, cb) {
      agent.put(`/api/client/${clientId}`)
        .set('Authorization', `Bearer ${tokenUdCa}`)
        .send(updates).expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          cb(null, clientId);
        });
    },
    // Check if the client is updated.
    function(clientId, cb) {
      agent.get(`/api/client/${clientId}`)
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          const client = res.body;
          if ((client.id !== clientId) ||
              (client.clientSecret !== updates.clientSecret) ||
              !_.isEqual(client.redirectUris, updates.redirectUris) ||
              !_.isEqual(client.scopes, updates.scopes) ||
              (client.name !== updates.name) ||
              (client.image !== updates.image)) {
            return void cb(Error('Client content is not the same as updated'));
          }
          cb(null, clientId);
        });
    }
  ], function(err) {
    if (!err) {
      clientCount++;
      clientDevCount++;
    }
    done(err);
  });
};

/**
 * `PUT /api/client/{clientId}` with wrong dev user.
 */
module.exports.putClientDevWrong = function(done) {
  agent.put(`/api/client/${testParams.client.all.id}`)
    .set('Authorization', `Bearer ${tokenUd2Ca}`)
    .send({ name: '' }).expect(404).end(function(err, res) {
      if (err) {
        return void done(err);
      } else if (res.body.code !== errid.ECLIENT_NOT_FOUND.obj.code) {
        return void done(Error('Should respond ECLIENT_NOT_FOUND error code'));
      }
      done(null);
    });
};

/**
 * `PUT /api/client/{clientId}` with invalid parameters.
 */
module.exports.putClientInvalid = function(done) {
  async.waterfall([
    // Send no parameter.
    function(cb) {
      agent.put(`/api/client/${testParams.client.all.id}`)
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send({}).expect(400).end(function(err, res) {
          if (err) {
            return void done(err);
          }
          done(null);
        });
    },
    // Send invalid clientSecret.
    function(cb) {
      agent.put(`/api/client/${testParams.client.all.id}`)
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send({ clientSecret: '' }).expect(400).end(function(err, res) {
          if (err) {
            return void done(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('clientSecret') < 0) {
            return void cb(Error('Should respond clientSecret error message'));
          }
          done(null);
        });
    },
    // Send invalid redirectUris.
    function(cb) {
      agent.put(`/api/client/${testParams.client.all.id}`)
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send({ redirectUris: [ '' ] }).expect(400).end(function(err, res) {
          if (err) {
            return void done(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('redirectUris') < 0) {
            return void cb(Error('Should respond redirectUris error message'));
          }
          done(null);
        });
    },
    // Send invalid scopes.
    function(cb) {
      agent.put(`/api/client/${testParams.client.all.id}`)
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send({ scopes: [ '' ] }).expect(400).end(function(err, res) {
          if (err) {
            return void done(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('scopes') < 0) {
            return void cb(Error('Should respond scopes error message'));
          }
          done(null);
        });
    },
    // Send invalid name.
    function(cb) {
      agent.put(`/api/client/${testParams.client.all.id}`)
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send({ name: '' }).expect(400).end(function(err, res) {
          if (err) {
            return void done(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('name') < 0) {
            return void cb(Error('Should respond name error message'));
          }
          done(null);
        });
    },
    // Send invalid image.
    function(cb) {
      agent.put(`/api/client/${testParams.client.all.id}`)
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send({ image: '' }).expect(400).end(function(err, res) {
          if (err) {
            return void done(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('image') < 0) {
            return void cb(Error('Should respond image error message'));
          }
          done(null);
        });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * `PUT /api/client/{clientId}` with non-exist client ID.
 */
module.exports.putClientNotExist = function(done) {
  agent.put(`/api/client/${testParams.client.all.id}1`)
    .set('Authorization', `Bearer ${tokenUaCa}`)
    .send({ name: '' }).expect(404).end(function(err, res) {
      if (err) {
        return void done(err);
      } else if (res.body.code !== errid.ECLIENT_NOT_FOUND.obj.code) {
        return void done(Error('Should respond ECLIENT_NOT_FOUND error code'));
      }
      done(null);
    });
};

/**
 * `PUT /api/client/{clientId}` with invalid user.
 */
module.exports.putClientInvalidPerm = function(done) {
  agent.put(`/api/client/${testParams.client.all.id}`)
    .set('Authorization', `Bearer ${tokenUuCa}`)
    .send({ name: '' }).expect(403).end(function(err, res) {
      if (err) {
        return void done(err);
      } else if (res.body.code !== errid.EPERM.obj.code) {
        return void done(Error('Should respond EPERM error code'));
      }
      done(null);
    });
};

/**
 * `GET /api/client/count` with dev user.
 */
module.exports.getClientCountDev = function(done) {
  agent.get('/api/client/count')
    .set('Authorization', `Bearer ${tokenUdCa}`)
    .expect(200).end(function(err, res) {
      if (err) {
        return void done(err);
      } else if (res.body.count !== clientDevCount) {
        return void done(
          Error(`Count must be ${clientDevCount}, not ${res.body.count}`));
      }
      done(null);
    });
};

/**
 * `GET /api/client/count` with admin user.
 */
module.exports.getClientCountAdmin = function(done) {
  agent.get('/api/client/count')
    .set('Authorization', `Bearer ${tokenUaCa}`)
    .expect(200).end(function(err, res) {
      if (err) {
        return void done(err);
      } else if (res.body.count !== clientCount) {
        return void done(
          Error(`Count must be ${clientCount}, not ${res.body.count}`));
      }
      done(null);
    });
};

/**
 * `GET /api/client/count` with options with admin user.
 */
module.exports.getClientCountCond = function(done) {
  agent.get('/api/client/count')
    .set('Authorization', `Bearer ${tokenUaCa}`)
    .query({ user: testParams.user.dev.userId }).expect(200)
    .end(function(err, res) {
      if (err) {
        return void done(err);
      } else if (res.body.count !== clientDevCount) {
        return void done(
          Error(`Count must be ${clientDevCount}, not ${res.body.count}`));
      }
      done(null);
    });
};

/**
 * `GET /api/client/count` with non-exist user ID.
 */
module.exports.getClientCountNotExist = function(done) {
  agent.get('/api/client/count')
    .set('Authorization', `Bearer ${tokenUaCa}`)
    .query({ user: `${testParams.user.dev.userId}1` }).expect(200)
    .end(function(err, res) {
      if (err) {
        return void done(err);
      } else if (res.body.count !== 0) {
        return void done(
          Error(`Count must be 0, not ${res.body.count}`));
      }
      done(null);
    });
};

/**
 * `GET /api/client/count` with invalid user.
 */
module.exports.getClientCountInvalidPerm = function(done) {
  agent.get('/api/client/count')
    .set('Authorization', `Bearer ${tokenUuCa}`)
    .expect(403).end(function(err, res) {
      if (err) {
        return void done(err);
      } else if (res.body.code !== errid.EPERM.obj.code) {
        return void done(Error('Should respond EPERM error code'));
      }
      done(null);
    });
};

/**
 * `GET /api/client/list` with sorting.
 */
module.exports.getClientListSort = function(done) {
  async.waterfall([
    // Get list of dev user.
    function(cb) {
      agent.get('/api/client/list')
        .set('Authorization', `Bearer ${tokenUdCa}`)
        .expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.length !== clientDevCount) {
            return void cb(Error(`List length is not ${clientDevCount}`));
          }
          cb(null);
        });
    },
    // Get list of admin user.
    function(cb) {
      agent.get('/api/client/list')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.length !== clientCount) {
            return void cb(Error(`List length is not ${clientCount}`));
          }
          cb(null);
        });
    },
    // Get list of dev user by admin user.
    function(cb) {
      agent.get('/api/client/list')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .query({ user: testParams.user.dev.userId }).expect(200)
        .end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.length !== clientDevCount) {
            return void cb(Error(`List length is not ${clientDevCount}`));
          }
          cb(null);
        });
    },
    // Get list of non-exist user by admin user.
    function(cb) {
      agent.get('/api/client/list')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .query({ user: `${testParams.user.dev.userId}1` }).expect(200)
        .end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.length !== 0) {
            return void cb(Error('List length is not 0'));
          }
          cb(null);
        });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * `GET /api/client/list` with paging.
 */
module.exports.getClientListPage = function(done) {
  let clientIds = [];
  const START = 100;
  const END = 110;
  async.waterfall([
    // Create dealers for test.
    function(cb) {
      let index = START;
      (function func() {
        const newDealer = {
          redirectUris: [],
          scopes: [],
          grants: [],
          userId: 'manager',
          name: `TesttEST clIeNT ${index}`
        };
        agent.post('/api/client')
          .set('Authorization', `Bearer ${tokenUaCa}`)
          .send(newDealer).expect(200).end(function(err, res) {
            if (err) {
              return void cb(err);
            }
            clientIds.push(res.body.clientId);
            ++index;
            if (index >= END) {
              return void cb(null);
            }
            func();
          });
      })();
    },
    // Get middle 3 items.
    function(cb) {
      const opts = {
        user: 'manager',
        num: 3,
        p: 2
      };
      agent.get('/api/client/list')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .query(opts).expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if ((res.body[0].name !==
                ('TesttEST clIeNT ' + (START + 3))) ||
              (res.body[1].name !== ('TesttEST clIeNT ' + (START + 4))) ||
              (res.body[2].name !== ('TesttEST clIeNT ' + (START + 5)))) {
            return void cb(Error('Get middle 3 items fail'));
          }
          cb(null);
        });
    },
    // Get tail items that the limit is larger than remaining items.
    function(cb) {
      const opts = {
        user: 'manager',
        num: 3,
        p: 4
      };
      agent.get('/api/client/list')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .query(opts).expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if ((res.body.length !== 1) ||
              (res.body[0].name !== ('TesttEST clIeNT ' + (END - 1)))) {
            return void cb(Error('Get last items fail'));
          }
          cb(null);
        });
    },
    // Remove dealers.
    function(cb) {
      let index = 0;
      (function func() {
        agent.delete(`/api/client/${clientIds[index]}`)
          .set('Authorization', `Bearer ${tokenUaCa}`)
          .expect(200).end(function(err, res) {
            if (err) {
              return void cb(err);
            }
            ++index;
            if (index >= clientIds.length) {
              return void cb(null);
            }
            func();
          });
      })();
    }
  ], function(err) {
    done(err);
  });
};

/**
 * `GET /api/client/list` with invalid parameters.
 */
module.exports.getClientListInvalid = function(done) {
  async.waterfall([
    // Send invalid num.
    function(cb) {
      agent.get('/api/client/list')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .query({ num: -1 }).expect(400).end(function(err, res) {
          if (err) {
            return void done(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void done(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('num') < 0) {
            return void cb(Error('Should respond num error message'));
          }
          cb(null);
        });
    },
    // Send invalid p.
    function(cb) {
      agent.get('/api/client/list')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .query({ p: -1 }).expect(400).end(function(err, res) {
          if (err) {
            return void done(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void done(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('p') < 0) {
            return void cb(Error('Should respond p error message'));
          }
          cb(null);
        });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * `GET /api/client/list` with invalid user.
 */
module.exports.getClientListInvalidPerm = function(done) {
  agent.get('/api/client/list')
    .set('Authorization', `Bearer ${tokenUuCa}`)
    .expect(403).end(function(err, res) {
      if (err) {
        return void done(err);
      } else if (res.body.code !== errid.EPERM.obj.code) {
        return void done(Error('Should respond EPERM error code'));
      }
      done(null);
    });
};

/**
 * `DELETE /api/client/user/{userId}`.
 */
module.exports.deleteClientUser = function(done) {
  let dev2Count = 0;

  async.waterfall([
    // Add a client to be removed.
    function(cb) {
      const newClientInfo = {
        redirectUris: [ 'test1', 'test2' ],
        scopes: [ 'rw' ],
        grants: [
          'authorization_code',
          'password',
          'client_credentials',
          'refresh_token'
        ],
        userId: testParams.user.dev2.userId,
        name: 'Remove User Client',
        image: 'http://example.com/image.png'
      };

      agent.post('/api/client')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send(newClientInfo).expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          clientCount++;
          cb(null);
        });
    },
    // Check if the user client is large than 0.
    function(cb) {
      agent.get('/api/client/count')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .query({ user: testParams.user.dev2.userId }).expect(200)
        .end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.count <= 0) {
            return void cb(Error('New client is not inserted'));
          }
          dev2Count = res.body.count;
          cb(null);
        });
    },
    // Remove user client.
    function(cb) {
      agent.delete(`/api/client/user/${testParams.user.dev2.userId}`)
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          clientCount -= dev2Count;
          cb(null);
        });
    },
    // Check if the user client is 0.
    function(cb) {
      agent.get('/api/client/count')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .query({ user: testParams.user.dev2.userId }).expect(200)
        .end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.count !== 0) {
            return void cb(Error('User client is not removed'));
          }
          cb(null);
        });
    },
    // Check if the other user clients ares changed.
    function(cb) {
      agent.get('/api/client/count')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.count !== clientCount) {
            return void cb(Error('User client is removed with side-effect'));
          }
          cb(null);
        });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * `DELETE /api/client/user/{userId}` with non-exist user ID.
 */
module.exports.deleteClientUserNotExist = function(done) {
  agent.delete(`/api/client/user/${testParams.user.dev.userId}1`)
    .set('Authorization', `Bearer ${tokenUaCa}`)
    .expect(404).end(function(err, res) {
      if (err) {
        return void done(err);
      } else if (res.body.code !== errid.EUSER_NOT_FOUND.obj.code) {
        return void done(Error('Should respond EUSER_NOT_FOUND error code'));
      }
      done(null);
    });
};

/**
 * `DELETE /api/client/user/{userId}` with invalid user.
 */
module.exports.deleteClientUserInvalidPerm = function(done) {
  agent.delete(`/api/client/user/${testParams.user.dev.userId}`)
    .set('Authorization', `Bearer ${tokenUdCa}`)
    .expect(403).end(function(err, res) {
      if (err) {
        return void done(err);
      } else if (res.body.code !== errid.EPERM.obj.code) {
        return void done(Error('Should respond EPERM error code'));
      }
      done(null);
    });
};
