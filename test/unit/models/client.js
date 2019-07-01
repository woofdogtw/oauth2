'use strict';

const _     = require('lodash');
const async = require('async');

const testParams = require('../../test-params');
let testModel;
let clientCount;

/**
 * Initialize model object. Call this before all test.
 *
 * @param {Object} model The model object to be used.
 */
module.exports.init = function(model) {
  testModel = model.client;
  clientCount = Object.keys(testParams.client).length;
};

/**
 * Test `client.getClient(clientId, opts)` without options.
 */
module.exports.getClient = function(done) {
  const c = testParams.client.all;
  testModel.getClient(c.id, function(err, client) {
    if (err) {
      return void done(err);
    } else if (!client) {
      return void done(Error('Cannot get client'));
    } else if ('userId' in client) {
      return void done(Error('Should not get hide fields'));
    } else if ((client.id !== c.id) ||
        !_.isEqual(client.created, c.created) ||
        (client.clientSecret !== c.clientSecret) ||
        !_.isEqual(client.redirectUris, c.redirectUris) ||
        !_.isEqual(client.grants, c.grants) || (client.name !== c.name) ||
        (client.image !== c.image)) {
      return void done(Error('Client content is not the same as inserted'));
    }
    if (((client.scopes === null) && (client.scopes !== c.scopes)) ||
        ((client.scopes !== null) && !_.isEqual(client.scopes, c.scopes))) {
      return void done(Error('Client content is not the same as inserted'));
    }
    done(null);
  });
};

/**
 * Test `client.getClient(clientId, opts)` with options.
 */
module.exports.getClientOpts = function(done) {
  const c = testParams.client.all;
  const opts = {
    fields: {
      userId: true
    }
  };
  testModel.getClient(c.id, opts, function(err, client) {
    if (err) {
      return void done(err);
    } else if (!client) {
      return void done(Error('Cannot get client'));
    } else if ((client.id !== c.id) ||
        !_.isEqual(client.created, c.created) ||
        (client.clientSecret !== c.clientSecret) ||
        !_.isEqual(client.redirectUris, c.redirectUris) ||
        !_.isEqual(client.grants, c.grants) || (client.userId !== c.userId) ||
        (client.name !== c.name) ||(client.image !== c.image)) {
      return void done(Error('Client content is not the same as inserted'));
    }
    if (((client.scopes === null) && (client.scopes !== c.scopes)) ||
        ((client.scopes !== null) && !_.isEqual(client.scopes, c.scopes))) {
      return void done(Error('Client content is not the same as inserted'));
    }
    done(null);
  });
};

/**
 * Test `client.getClient(clientId, opts)` with wrong client ID.
 */
module.exports.getClientWrong = function(done) {
  testModel.getClient(`${testParams.client.all.id}1`, function(err, client) {
    if (err) {
      return void done(err);
    } else if (client) {
      return void done(Error('Get client which does not exist'));
    }
    done(null);
  });
};

/**
 * Test `client.getClient(clientId, opts)` with invalid parameters.
 */
module.exports.getClientInvalid = function(done) {
  testModel.getClient(123, function(err, client) {
    if (!err) {
      return void done(Error('Cannot check invalid parameters'));
    } else if (err.message.indexOf('ValidationError') < 0) {
      return void done(Error('Not a validator error'));
    }
    done(null);
  });
};

/**
 * Test `client.addClient(client)` with complete info.
 */
module.exports.addClient = function(done) {
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
    name: 'New Client',
    image: 'http://example.com/image.png'
  };

  async.waterfall([
    // Add a client.
    function(cb) {
      testModel.addClient(newClientInfo, function(err, clientId) {
        cb(err, clientId);
      });
    },
    // Check if the client is inserted correctly.
    function(clientId, cb) {
      const opts = {
        fields: {
          userId: true
        }
      };
      testModel.getClient(clientId, opts, function(err, client) {
        if (err) {
          return void cb(err);
        } else if (!client) {
          return void cb(Error('Cannot get new client'));
        } else if ((client.id !== clientId) ||
            !(client.created instanceof Date) ||
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
 * Test `client.addClient(client)` with default info.
 */
module.exports.addClientDefault = function(done) {
  const newClientInfo = {
    redirectUris: [ 'test1', 'test2' ],
    scopes: null,
    grants: [
      'authorization_code',
      'password',
      'client_credentials',
      'refresh_token'
    ],
    userId: testParams.user.dev.userId
  };

  async.waterfall([
    // Add a client.
    function(cb) {
      testModel.addClient(newClientInfo, function(err, clientId) {
        cb(err, clientId);
      });
    },
    // Check if the client is inserted correctly.
    function(clientId, cb) {
      const opts = {
        fields: {
          userId: true
        }
      };
      testModel.getClient(clientId, opts, function(err, client) {
        if (err) {
          return void cb(err);
        } else if (!client) {
          return void cb(Error('Cannot get new client'));
        } else if ((client.id !== clientId) ||
            !(client.created instanceof Date) ||
            !_.isEqual(client.redirectUris, newClientInfo.redirectUris) ||
            !_.isEqual(client.scopes, newClientInfo.scopes) ||
            !_.isEqual(client.grants, newClientInfo.grants) ||
            (client.userId !== newClientInfo.userId) ||
            (client.name !== '') || (client.image !== '')) {
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
 * Test `client.addClient(client)` with invalid parameters.
 */
module.exports.addClientInvalid = function(done) {
  const newClientStr = JSON.stringify({
    redirectUris: [ 'test1', 'test2' ],
    scopes: null,
    grants: [
      'authorization_code',
      'password',
      'client_credentials',
      'refresh_token'
    ],
    userId: '123'
  });

  async.waterfall([
    // Send invalid redirectUris.
    function(cb) {
      let newClient = JSON.parse(newClientStr);
      newClient.redirectUris = [ '' ];
      testModel.addClient(newClient, function(err, clientId) {
        if (!err || (err.message.indexOf('redirectUris') < 0)) {
          return void cb(Error('Cannot check invalid parameters'));
        } else if (err.message.indexOf('ValidationError') < 0) {
          return void cb(Error('Not a validator error'));
        }
        cb(null);
      });
    },
    // Send invalid scopes.
    function(cb) {
      let newClient = JSON.parse(newClientStr);
      newClient.scopes = [ '' ];
      testModel.addClient(newClient, function(err, clientId) {
        if (!err || (err.message.indexOf('scopes') < 0)) {
          return void cb(Error('Cannot check invalid parameters'));
        } else if (err.message.indexOf('ValidationError') < 0) {
          return void cb(Error('Not a validator error'));
        }
        cb(null);
      });
    },
    // Send invalid grants.
    function(cb) {
      let newClient = JSON.parse(newClientStr);
      newClient.grants = [ '' ];
      testModel.addClient(newClient, function(err, clientId) {
        if (!err || (err.message.indexOf('grants') < 0)) {
          return void cb(Error('Cannot check invalid parameters'));
        } else if (err.message.indexOf('ValidationError') < 0) {
          return void cb(Error('Not a validator error'));
        }
        cb(null);
      });
    },
    // Send invalid userId.
    function(cb) {
      let newClient = JSON.parse(newClientStr);
      newClient.userId = 1;
      testModel.addClient(newClient, function(err, clientId) {
        if (!err || (err.message.indexOf('userId') < 0)) {
          return void cb(Error('Cannot check invalid parameters'));
        } else if (err.message.indexOf('ValidationError') < 0) {
          return void cb(Error('Not a validator error'));
        }
        cb(null);
      });
    },
    // Send invalid name.
    function(cb) {
      let newClient = JSON.parse(newClientStr);
      newClient.name = 1;
      testModel.addClient(newClient, function(err, clientId) {
        if (!err || (err.message.indexOf('name') < 0)) {
          return void cb(Error('Cannot check invalid parameters'));
        } else if (err.message.indexOf('ValidationError') < 0) {
          return void cb(Error('Not a validator error'));
        }
        cb(null);
      });
    },
    // Send invalid image.
    function(cb) {
      let newClient = JSON.parse(newClientStr);
      newClient.image = 1;
      testModel.addClient(newClient, function(err, clientId) {
        if (!err || (err.message.indexOf('image') < 0)) {
          return void cb(Error('Cannot check invalid parameters'));
        } else if (err.message.indexOf('ValidationError') < 0) {
          return void cb(Error('Not a validator error'));
        }
        cb(null);
      });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * Test `client.rmClient(clientId)`.
 */
module.exports.rmClient = function(done) {
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
    name: 'Remove Client',
    image: 'http://example.com/image.png'
  };

  async.waterfall([
    // Add a client.
    function(cb) {
      testModel.addClient(newClientInfo, function(err, clientId) {
        cb(err, clientId);
      });
    },
    // Check if the client is inserted.
    function(clientId, cb) {
      testModel.getClient(clientId, function(err, client) {
        if (err) {
          return void cb(err);
        } else if (!client) {
          return void cb(Error('The client is not inserted'));
        }
        cb(null, clientId);
      });
    },
    // Remove the client.
    function(clientId, cb) {
      testModel.rmClient(clientId, function(err) {
        cb(err, clientId);
      });
    },
    // Check if the client is removed.
    function(clientId, cb) {
      testModel.getClient(clientId, function(err, client) {
        if (err) {
          return void cb(err);
        } else if (client) {
          return void cb(Error('The client is not removed'));
        }
        cb(null);
      });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * Test `client.rmClient(clientId)` with invalid client ID.
 */
module.exports.rmClientInvalidId = function(done) {
  testModel.rmClient(123, function(err) {
    if (!err) {
      return void done(Error('Cannot check invalid parameters'));
    } else if (err.message.indexOf('ValidationError') < 0) {
      return void done(Error('Not a validator error'));
    }
    done(null);
  });
};

/**
 * Test `client.updateClient(clientId, updates)`.
 */
module.exports.updateClient = function(done) {
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
      testModel.addClient(newClientInfo, function(err, clientId) {
        cb(err, clientId);
      });
    },
    // Check if the client is inserted.
    function(clientId, cb) {
      testModel.getClient(clientId, function(err, client) {
        if (err) {
          return void cb(err);
        } else if (!client) {
          return void cb(Error('The client is not inserted'));
        }
        cb(null, clientId);
      });
    },
    // Update the client.
    function(clientId, cb) {
      testModel.updateClient(clientId, updates, function(err) {
        cb(err, clientId);
      });
    },
    // Check if the client is updated.
    function(clientId, cb) {
      testModel.getClient(clientId, function(err, client) {
        if (err) {
          return void cb(err);
        } else if (!client) {
          return void cb(Error('Cannot get the client'));
        } else if ((client.id !== clientId) ||
            (client.clientSecret !== updates.clientSecret) ||
            !_.isEqual(client.redirectUris, updates.redirectUris) ||
            !_.isEqual(client.scopes, updates.scopes) ||
            (client.name !== updates.name) ||
            (client.image !== updates.image)) {
          return void cb(Error('Client content is not the same as updated'));
        }
        cb(null, clientId);
      });
    },
    // Update the client.
    function(clientId, cb) {
      testModel.updateClient(clientId, { scopes: null }, function(err) {
        cb(err, clientId);
      });
    },
    // Check if the client is updated.
    function(clientId, cb) {
      testModel.getClient(clientId, function(err, client) {
        if (err) {
          return void cb(err);
        } else if (!client) {
          return void cb(Error('Cannot get the client'));
        } else if (client.scopes !== null) {
          return void cb(Error('Client content is not the same as updated'));
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
 * Test `client.updateClient(clientId, updates)` with invalid client ID.
 */
module.exports.updateClientInvalidId = function(done) {
  testModel.updateClient(123, {}, function(err) {
    if (!err) {
      return void done(Error('Cannot check invalid parameters'));
    } else if (err.message.indexOf('ValidationError') < 0) {
      return void done(Error('Not a validator error'));
    }
    done(null);
  });
};

/**
 * Test `client.updateClient(clientId, updates)` with invalid parameters.
 */
module.exports.updateClientInvalid = function(done) {
  async.waterfall([
    // Send no parameter.
    function(cb) {
      testModel.updateClient('123', {}, function(err) {
        if (!err) {
          return void cb(Error('Cannot check invalid parameters'));
        } else if (err.message.indexOf('ValidationError') < 0) {
          return void cb(Error('Not a validator error'));
        }
        cb(null);
      });
    },
    // Send invalid clientSecret.
    function(cb) {
      testModel.updateClient('123', { clientSecret: '' }, function(err) {
        if (!err || (err.message.indexOf('clientSecret') < 0)) {
          return void cb(Error('Cannot check invalid parameters'));
        } else if (err.message.indexOf('ValidationError') < 0) {
          return void cb(Error('Not a validator error'));
        }
        cb(null);
      });
    },
    // Send invalid redirectUris.
    function(cb) {
      testModel.updateClient('123', { redirectUris: [ '' ] }, function(err) {
        if (!err || (err.message.indexOf('redirectUris') < 0)) {
          return void cb(Error('Cannot check invalid parameters'));
        } else if (err.message.indexOf('ValidationError') < 0) {
          return void cb(Error('Not a validator error'));
        }
        cb(null);
      });
    },
    // Send invalid scopes.
    function(cb) {
      testModel.updateClient('123', { scopes: [ '' ] }, function(err) {
        if (!err || (err.message.indexOf('scopes') < 0)) {
          return void cb(Error('Cannot check invalid parameters'));
        } else if (err.message.indexOf('ValidationError') < 0) {
          return void cb(Error('Not a validator error'));
        }
        cb(null);
      });
    },
    // Send invalid name.
    function(cb) {
      testModel.updateClient('123', { name: 1 }, function(err) {
        if (!err || (err.message.indexOf('name') < 0)) {
          return void cb(Error('Cannot check invalid parameters'));
        } else if (err.message.indexOf('ValidationError') < 0) {
          return void cb(Error('Not a validator error'));
        }
        cb(null);
      });
    },
    // Send invalid image.
    function(cb) {
      testModel.updateClient('123', { image: 1 }, function(err) {
        if (!err || (err.message.indexOf('image') < 0)) {
          return void cb(Error('Cannot check invalid parameters'));
        } else if (err.message.indexOf('ValidationError') < 0) {
          return void cb(Error('Not a validator error'));
        }
        cb(null);
      });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * Test `client.getClientCount(opts)` without options.
 */
module.exports.getClientCount = function(done) {
  testModel.getClientCount(function(err, count) {
    if (err) {
      return void done(err);
    } else if (count !== clientCount) {
      return void done(Error(`Count must be ${clientCount}, not ${count}`));
    }
    done(null);
  });
};

/**
 * Test `client.getClientCount(opts)` with conditions.
 */
module.exports.getClientCountCond = function(done) {
  const newClientInfo = {
    redirectUris: [ 'test1', 'test2' ],
    scopes: [ 'rw' ],
    grants: [
      'authorization_code',
      'password',
      'client_credentials',
      'refresh_token'
    ],
    userId: `${testParams.user.dev.userId}1`
  };

  async.waterfall([
    // Add a client.
    function(cb) {
      testModel.addClient(newClientInfo, function(err, clientId) {
        cb(err, clientId);
      });
    },
    // Check if the new client is not effect the search result.
    function(clientId, cb) {
      const opts = {
        cond: {
          userId: testParams.user.dev.userId
        }
      };
      testModel.getClientCount(opts, function(err, count) {
        if (err) {
          return void cb(err);
        } else if (count !== clientCount) {
          return void done(Error(`Count must be ${clientCount}, not ${count}`));
        }
        cb(null, clientId);
      });
    },
    // Remove the temporary client.
    function(clientId, cb) {
      testModel.rmClient(clientId, function(err) {
        cb(err);
      });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * Test `client.getClientList(opts)` sorting.
 */
module.exports.getClientListSort = function(done) {
  let newClientInfo1 = {
    redirectUris: [ 'test1', 'test2' ],
    scopes: [ 'rw' ],
    grants: [
      'authorization_code',
      'password',
      'client_credentials',
      'refresh_token'
    ],
    userId: `${testParams.user.dev.userId}1`,
    name: 'List Client 2-1'
  };
  let newClientInfo2 = {
    redirectUris: [ 'test1', 'test2' ],
    scopes: [ 'rw' ],
    grants: [
      'authorization_code',
      'password',
      'client_credentials',
      'refresh_token'
    ],
    userId: `${testParams.user.dev.userId}1`,
    name: 'List Client 1-2'
  };
  const fields = {
    userId: true
  };

  async.waterfall([
    // Insert clients for test sorting.
    function(cb) {
      testModel.addClient(newClientInfo1, function(err, clientId) {
        if (err) {
          return void cb(err);
        }
        newClientInfo1.id = clientId;

        testModel.addClient(newClientInfo2, function(err, clientId) {
          if (err) {
            return void cb(err);
          }
          newClientInfo2.id = clientId;
          cb(null);
        });
      });
    },
    // Use default sort.
    function(cb) {
      testModel.getClientList(function(err, list) {
        if (err) {
          return void cb(err);
        }
        for (let i = 0; i < list.length; i++) {
          if (list[i].name === newClientInfo2.name) {
            if (list[i + 1].name === newClientInfo1.name) {
              return void cb(null);
            }
          }
        }
        cb(Error('Default sorting error'));
      });
    },
    // Use name DESC.
    function(cb) {
      const opts = {
        fields: fields,
        sort: [ { key: 'userId', asc: true }, { key: 'name', asc: false } ]
      };
      testModel.getClientList(opts, function(err, list) {
        if (err) {
          return void cb(err);
        }
        for (let i = 0; i < list.length; i++) {
          if (list[i].name === newClientInfo1.name) {
            if (list[i + 1].name === newClientInfo2.name) {
              return void cb(null);
            }
          }
        }
        cb(Error('Name sorting error'));
      });
    }
  ], function(err) {
    // Remove test clients.
    testModel.rmClient(newClientInfo1.id, function(e) {
      testModel.rmClient(newClientInfo2.id, function(e) {
        done(err);
      });
    });
  });
};

/**
 * Test `client.getClientList(opts)` paging.
 */
module.exports.getClientListPage = function(done) {
  let clientList = [];
  const START = 100;
  const END = 110;
  async.waterfall([
    // Insert data.
    function(cb) {
      let index = START;
      (function insert() {
        let newClient = {
          redirectUris: [ 'test1', 'test2' ],
          scopes: [ 'rw' ],
          grants: [
            'authorization_code',
            'password',
            'client_credentials',
            'refresh_token'
          ],
          userId: `${testParams.user.dev.userId}1`,
          name: 'Page client ' + index
        };
        testModel.addClient(newClient, function(err, clientId) {
          if (err) {
            return void cb(err);
          }
          newClient.id = clientId;
          clientList.push(newClient);
          index++;
          if (index >= END) {
            return void cb(null);
          }
          process.nextTick(insert);
        });
      })();
    },
    // Get middle 3 items.
    function(cb) {
      const userId = `${testParams.user.dev.userId}1`;
      const opts = { cond: { userId: userId }, skip: 4, limit: 3 };
      testModel.getClientList(opts, function(err, list) {
        if (err) {
          return void cb(err);
        } else if ((list[0].name !== ('Page client ' + (START + 4))) ||
            (list[1].name !== ('Page client ' + (START + 5))) ||
            (list[2].name !== ('Page client ' + (START + 6)))) {
          return void cb(Error('Get middle 3 items fail'));
        }
        cb(null);
      });
    },
    // Get tail items that the limit is larger than remaining items.
    function(cb) {
      const userId = `${testParams.user.dev.userId}1`;
      const opts = {
        cond: { userId: userId },
        skip: (END - START - 2),
        limit: 3
      };
      testModel.getClientList(opts, function(err, list) {
        if (err) {
          return void cb(err);
        } else if ((list.length !== 2) ||
            (list[0].name !== ('Page client ' + (END - 2))) ||
            (list[1].name !== ('Page client ' + (END - 1)))) {
          return void cb(Error('Get last items fail'));
        }
        cb(null);
      });
    },
    // Remove clients.
    function(cb) {
      let index = START;
      (function remove() {
        testModel.rmClient(clientList[index - 100].id, function(err) {
          index++;
          if (!clientList[index - 100]) {
            return void cb(null);
          }
          process.nextTick(remove);
        });
      })();
    }
  ], function(err) {
    done(err);
  });
};

/**
 * Test `client.rmClientUser(userId)`.
 */
module.exports.rmClientUser = function(done) {
  const userId = `${testParams.user.dev.userId}1`;

  let clientList = [];
  const START = 100;
  const END = 110;
  async.waterfall([
    // Insert data.
    function(cb) {
      let index = START;
      (function insert() {
        let newClient = {
          redirectUris: [ 'test1', 'test2' ],
          scopes: [ 'rw' ],
          grants: [
            'authorization_code',
            'password',
            'client_credentials',
            'refresh_token'
          ],
          userId: userId,
          name: 'Page client ' + index
        };
        testModel.addClient(newClient, function(err, clientId) {
          if (err) {
            return void cb(err);
          }
          newClient.id = clientId;
          clientList.push(newClient);
          index++;
          if (index >= END) {
            return void cb(null);
          }
          process.nextTick(insert);
        });
      })();
    },
    // Get client count.
    function(cb) {
      let opts = { cond: { userId: userId } };
      testModel.getClientCount(opts, function(err, count) {
        if (err) {
          return void cb(err);
        } else if (count !== (END - START)) {
          return void done(Error('Client count error'));
        }
        cb(null);
      });
    },
    // Remove clients.
    function(cb) {
      testModel.rmClientUser(userId, function(err) {
        cb(err);
      });
    },
    // Check client count.
    function(cb) {
      let opts = { cond: { userId: userId } };
      testModel.getClientCount(opts, function(err, count) {
        if (err) {
          return void cb(err);
        } else if (count > 0) {
          return void done(Error('Clients not removed completely'));
        }
        cb(null);
      });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * Test `client.rmClientUser(userId)` with invalid user ID.
 */
module.exports.rmClientUserInvalidId = function(done) {
  testModel.rmClientUser(123, function(err) {
    if (!err) {
      return void done(Error('Cannot check invalid parameters'));
    } else if (err.message.indexOf('ValidationError') < 0) {
      return void done(Error('Not a validator error'));
    }
    done(null);
  });
};
