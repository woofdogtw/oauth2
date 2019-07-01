'use strict';

const _     = require('lodash');
const Ajv   = require('ajv');
const async = require('async');

const errid      = require('../../../lib/error').errid;
const testParams = require('../../test-params');

const tokenUaCa = testParams.token.uaca.accessToken;
const tokenUmCa = testParams.token.umca.accessToken;
const tokenUdCa = testParams.token.udca.accessToken;

let agent;
let ajv = new Ajv({
  format: 'full'
});
let userCount;

/**
 * Initialize request agent. Call this before all test.
 *
 * @param {Object} _agent The Express app object to be used.
 */
module.exports.init = function(_agent) {
  agent = _agent;
  userCount = Object.keys(testParams.user).length;
};

/**
 * `GET /api/user/{userId}`.
 */
module.exports.getUser = function(done) {
  const u = testParams.user.admin;
  agent.get(`/api/user/${u.userId}`)
    .set('Authorization', `Bearer ${tokenUaCa}`)
    .expect(200).end(function(err, res) {
      if (err) {
        return void done(err);
      }
      const schema = {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          email: { type: 'string', format: 'email' },
          created: { type: 'string', format: 'date-time' },
          validated: { type: [ 'string', 'null' ], foramt: 'date-time' },
          expired: { type: [ 'string', 'null' ], foramt: 'date-time' },
          disabled: { type: 'boolean' },
          roles: {
            type: 'object',
            patternNames: { pattern: '^[A-Za-z]+[A-Za-z0-9]*$' },
            patternProperties:
              { '^[A-Za-z]+[A-Za-z0-9]*$': { type: 'boolean' } }
          },
          name: { type: 'string' },
          info: { type: 'object' }
        },
        required: [
          'userId', 'email', 'created', 'validated', 'expired', 'disabled',
          'roles', 'name', 'info'
        ],
        additionalProperties: false
      };
      if (!ajv.validate(schema, res.body)) {
        return void done(Error(ajv.errorsText()));
      }
      const user = res.body;
      if ((user.userId !== u.userId) || (user.email !== u.email) ||
          !_.isEqual(new Date(user.created), u.created) ||
          !_.isEqual(new Date(user.validated), u.validated) ||
          (user.expired !== u.expired) || (user.disabled !== u.disabled) ||
          !_.isEqual(user.roles, u.roles) || (user.name !== u.name) ||
          !_.isEqual(user.info, u.info)) {
        return void done(Error('User information are difference'));
      }
      done(null);
    });
};

/**
 * `GET /api/user/{userId}` with non-exist user ID.
 */
module.exports.getUserNotExist = function(done) {
  agent.get(`/api/user/${testParams.user.admin.userId}1`)
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
 * `GET /api/user/{userId}` with invalid user.
 */
module.exports.getUserInvalidPerm = function(done) {
  agent.get(`/api/user/${testParams.user.admin.userId}`)
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

/**
 * `POST /api/user`.
 */
module.exports.postUser = function(done) {
  const newUserInfo = {
    email: 'TEST-add@example.org',
    password: 'testtest',
    name: 'New User',
    info: {
      first: 'First',
      last: 'Last'
    }
  };

  async.waterfall([
    // Add a user.
    function(cb) {
      agent.post('/api/user')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send(newUserInfo).expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (!res.body.userId ||
              (typeof(res.body.userId) !== 'string')) {
            return void cb(Error('Must respond userId'));
          } else if (Object.keys(res.body).length > 1) {
            return void cb(Error('Should have only one userId key'));
          }
          cb(null, res.body.userId);
        });
    },
    // Get the user information.
    function(userId, cb) {
      agent.get(`/api/user/${userId}`)
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.userId !== userId) {
            return void cb(Error('Cannot get the new user'));
          }
          const user = res.body;
          if ((user.email !== newUserInfo.email.toLowerCase()) ||
              isNaN((new Date(user.created)).getTime()) ||
              (user.validated !== null) ||
              isNaN((new Date(user.expired)).getTime()) ||
              (user.disabled !== false) || !_.isEqual(user.roles, {}) ||
              (user.name !== newUserInfo.name) ||
              !_.isEqual(user.info, newUserInfo.info)) {
            return void cb(Error('User content is not the same as inserted'));
          }
          cb(null);
        });
    },
    // Login with new password.
    function(cb) {
      const data = {
        username: newUserInfo.email,
        password: newUserInfo.password
      };
      agent.post('/api/session/login').type('form').send(data).expect(200)
        .end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          const token = res.body;
          if ((typeof(token.accessToken) !== 'string') ||
              (typeof(token.refreshToken) !== 'string')) {
            return void cb(Error('Login with new password failed'));
          }
          cb(null);
        });
    }
  ], function(err) {
    if (!err) {
      userCount++;
    }
    done(err);
  });
};

/**
 * `POST /api/user` with registered email.
 */
module.exports.postUserExist = function(done) {
  const newUserInfo = {
    email: 'TEST-add@example.org',
    password: 'testtest',
    name: 'New User',
    info: {}
  };

  async.waterfall([
    // Add a user.
    function(cb) {
      agent.post('/api/user')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send(newUserInfo).expect(400).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.EUSER_EXISTS.obj.code) {
            return void cb(Error('Should respond EUSER_EXISTS error code'));
          }
          cb(null);
        });
    },
    // Add a user with a little-bit different email.
    function(cb) {
      const userInfo = JSON.parse(JSON.stringify(newUserInfo));
      userInfo.email = userInfo.email + '1';
      agent.post('/api/user')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send(userInfo).expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          cb(null);
        });
    }
  ], function(err) {
    if (!err) {
      userCount++;
    }
    done(err);
  });
};

/**
 * `POST /api/user` with invalid parameters.
 */
module.exports.postUserInvalid = function(done) {
  const newUserStr = JSON.stringify({
    email: 'TEST-add3@localhost.com',
    password: 'testtest'
  });

  async.waterfall([
    // Send invalid email.
    function(cb) {
      let newUser = JSON.parse(newUserStr);
      newUser.email = 'TEST-add3@';
      agent.post('/api/user')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send(newUser).expect(400).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('email') < 0) {
            return void cb(Error('Should respond email error message'));
          }
          cb(null);
        });
    },
    // Send invalid password.
    function(cb) {
      let newUser = JSON.parse(newUserStr);
      newUser.password = '';
      agent.post('/api/user')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send(newUser).expect(400).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('password') < 0) {
            return void cb(Error('Should respond password error message'));
          }
          cb(null);
        });
    },
    // Send invalid name.
    function(cb) {
      let newUser = JSON.parse(newUserStr);
      newUser.name = 1;
      agent.post('/api/user')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send(newUser).expect(400).end(function(err, res) {
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
    // Send invalid info.
    function(cb) {
      let newUser = JSON.parse(newUserStr);
      newUser.info = [];
      agent.post('/api/user')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send(newUser).expect(400).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('info') < 0) {
            return void cb(Error('Should respond info error message'));
          }
          cb(null);
        });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * `POST /api/user` with invalid user.
 */
module.exports.postUserInvalidPerm = function(done) {
  agent.post('/api/user')
    .set('Authorization', `Bearer ${tokenUdCa}`)
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
 * `DELETE /api/user/{userId}`.
 */
module.exports.deleteUser = function(done) {
  const newUserInfo = {
    email: 'TEST-rm@example.org',
    password: 'testtest'
  };

  async.waterfall([
    // Add a user.
    function(cb) {
      agent.post('/api/user')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send(newUserInfo).expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          cb(null, res.body.userId);
        });
    },
    // Remove the user.
    function(userId, cb) {
      agent.delete(`/api/user/${userId}`)
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          cb(null, userId);
        });
    },
    // Check if the user is removed.
    function(userId, cb) {
      agent.get(`/api/user/${userId}`)
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .expect(404).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.EUSER_NOT_FOUND.obj.code) {
            return void cb(
              Error('Should respond EUSER_NOT_FOUND error code'));
          }
          cb(null);
        });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * `DELETE /api/user/{userId}` with non-exist user ID.
 */
module.exports.deleteUserNotExist = function(done) {
  agent.delete('/api/user/123')
    .set('Authorization', `Bearer ${tokenUaCa}`)
    .expect(404).end(function(err, res) {
      if (err) {
        return void done(err);
      } else if (res.body.code !== errid.EUSER_NOT_FOUND.obj.code) {
        return void done(
          Error('Should respond EUSER_NOT_FOUND error code'));
      }
      done(null);
    });
};

/**
 * `DELETE /api/user/{userId}` with invalid user.
 */
module.exports.deleteUserInvalidPerm = function(done) {
  agent.delete('/api/user/123')
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

/**
 * `PUT /api/user/{userId}`.
 */
module.exports.putUser = function(done) {
  const newUserInfo = {
    email: 'TEST-update@example.org',
    password: 'testtest'
  };
  const updates = {
    validated: new Date(),
    disabled: true,
    roles: { test: true },
    password: '123123',
    name: 'New User',
    info: {
      first: 'First',
      last: 'Last'
    }
  };

  async.waterfall([
    // Add a user.
    function(cb) {
      agent.post('/api/user')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send(newUserInfo).expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          cb(null, res.body.userId);
        });
    },
    // Update the user.
    function(userId, cb) {
      agent.put(`/api/user/${userId}`)
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send(updates).expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          cb(null, userId);
        });
    },
    // Check if the user is updated.
    function(userId, cb) {
      agent.get(`/api/user/${userId}`)
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          const user = res.body;
          if ((user.userId !== userId) ||
              (user.validated !== updates.validated.toISOString()) ||
              (user.expired !== null) || (user.disabled !== true) ||
              !_.isEqual(user.roles, updates.roles) ||
              (user.name !== updates.name) ||
              !_.isEqual(user.info, updates.info)) {
            return void cb(Error('User content is not the same as updated'));
          }
          cb(null, userId);
        });
    },
    // Enable the user.
    function(userId, cb) {
      agent.put(`/api/user/${userId}`)
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send({ disabled: false }).expect(200).end(function(err, res) {
          cb(err, userId);
        });
    },
    // Check if the user name and password is correct.
    function(userId, cb) {
      const data = {
        username: newUserInfo.email,
        password: updates.password
      };
      agent.post('/api/session/login').type('form').send(data).expect(200)
        .end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          const token = res.body;
          if ((typeof(token.accessToken) !== 'string') ||
              (typeof(token.refreshToken) !== 'string')) {
            return void cb(Error('Login with new password failed'));
          }
          cb(null);
        });
    }
  ], function(err) {
    if (!err) {
      userCount++;
    }
    done(err);
  });
};

/**
 * `PUT /api/user/{userId}` with non-exist user ID.
 */
module.exports.putUserNotExist = function(done) {
  agent.put('/api/user/123')
    .set('Authorization', `Bearer ${tokenUaCa}`)
    .send({ name: '' }).expect(404).end(function(err, res) {
      if (err) {
        return void done(err);
      } else if (res.body.code !== errid.EUSER_NOT_FOUND.obj.code) {
        return void done(
          Error('Should respond EUSER_NOT_FOUND error code'));
      }
      done(null);
    });
};

/**
 * `PUT /api/user/{userId}` with invalid parameters.
 */
module.exports.putUserInvalid = function(done) {
  async.waterfall([
    // Send no parameter.
    function(cb) {
      agent.put('/api/user/123')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .expect(400).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          }
          cb(null);
        });
    },
    // Send invalid validated.
    function(cb) {
      agent.put('/api/user/123')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send({ validated: Date.now() }).expect(400).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('validated') < 0) {
            return void cb(Error('Should respond validated error message'));
          }
          cb(null);
        });
    },
    // Send invalid disabled.
    function(cb) {
      agent.put('/api/user/123')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send({ disabled: 1 }).expect(400).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('disabled') < 0) {
            return void cb(Error('Should respond disabled error message'));
          }
          cb(null);
        });
    },
    // Send invalid roles.
    function(cb) {
      agent.put('/api/user/123')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send({ roles: { a$: 1 } }).expect(400).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('roles') < 0) {
            return void cb(Error('Should respond roles error message'));
          }
          cb(null);
        });
    },
    // Send invalid password.
    function(cb) {
      agent.put('/api/user/123')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send({ password: '' }).expect(400).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('password') < 0) {
            return void cb(Error('Should respond password error message'));
          }
          cb(null);
        });
    },
    // Send invalid name.
    function(cb) {
      agent.put('/api/user/123')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send({ name: 1 }).expect(400).end(function(err, res) {
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
    // Send invalid info.
    function(cb) {
      agent.put('/api/user/123')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send({ info: [] }).expect(400).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('info') < 0) {
            return void cb(Error('Should respond info error message'));
          }
          cb(null);
        });
    },
    // Send invalid parameters for manager.
    function(cb) {
      const updates = {
        validated: (new Date()).toISOString(),
        password: 'password',
        name: 'name',
        info: {}
      };
      agent.put('/api/user/123')
        .set('Authorization', `Bearer ${tokenUmCa}`)
        .send(updates).expect(400).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void cb(Error('Should respond EPARAM error code'));
          }
          cb(null);
        });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * `PUT /api/user/{userId}` with invalid user.
 */
module.exports.putUserInvalidPerm = function(done) {
  agent.put('/api/user/123')
    .set('Authorization', `Bearer ${tokenUdCa}`)
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
 * `GET /api/user/count` without options.
 */
module.exports.getUserCount = function(done) {
  agent.get('/api/user/count')
    .set('Authorization', `Bearer ${tokenUaCa}`)
    .expect(200).end(function(err, res) {
      if (err) {
        return void done(err);
      } else if (res.body.count !== userCount) {
        return void done(
          Error(`Count must be ${userCount}, not ${res.body.count}`));
      }
      done(null);
    });
};

/**
 * `GET /api/user/count` with options.
 */
module.exports.getUserCountCond = function(done) {
  const newUserInfo = {
    email: 'TEST-contains@abc.com',
    password: 'testtest'
  };

  async.waterfall([
    // Add a user.
    function(cb) {
      agent.post('/api/user')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send(newUserInfo).expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          cb(null, res.body.userId);
        });
    },
    // Get the specified email.
    function(userId, cb) {
      agent.get('/api/user/count')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .query({ email: testParams.user.user.email }).expect(200)
        .end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.count !== 1) {
            return void cb(Error(`Count must be 1, not ${res.body.count}`));
          }
          cb(null, userId);
        });
    },
    // Check if the new user is not effect the search result.
    function(userId, cb) {
      agent.get('/api/user/count')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .query({ contains: 'example' }).expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if (res.body.count !== userCount) {
            return void cb(
              Error(`Count must be ${userCount}, not ${res.body.count}`));
          }
          cb(null, userId);
        });
    },
    // Remove the temporary user.
    function(userId, cb) {
      agent.delete(`/api/user/${userId}`)
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          cb(null);
        });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * `GET /api/user/count` with invalid user.
 */
module.exports.getUserCountInvalidPerm = function(done) {
  agent.get('/api/user/count')
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

/**
 * `GET /api/user/list` with sorting.
 */
module.exports.getUserListSort = function(done) {
  let newUserInfo1 = {
    email: 'test@exampld.com',
    password: 'testtest',
    name: 'Test'
  };
  let newUserInfo2 = {
    email: 'test@example.com',
    password: 'testtest',
    name: 'Test'
  };
  let newUserInfo3 = {
    email: 'test@examplf.com',
    password: 'testtest',
    name: 'Tess'
  };
  const fields = 'expired,disabled';

  async.waterfall([
    // Insert users for test sorting.
    function(cb) {
      agent.post('/api/user')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .send(newUserInfo1).expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          newUserInfo1.userId = res.body.userId;

          agent.post('/api/user')
            .set('Authorization', `Bearer ${tokenUaCa}`)
            .send(newUserInfo2).expect(200).end(function(err, res) {
              if (err) {
                return void cb(err);
              }
              newUserInfo2.userId = res.body.userId;

              agent.post('/api/user')
                .set('Authorization', `Bearer ${tokenUaCa}`)
                .send(newUserInfo3).expect(200).end(function(err, res) {
                  if (err) {
                    return void cb(err);
                  }
                  newUserInfo2.userId = res.body.userId;
                  cb(null);
                });
            });
        });
    },
    // Use default sort.
    function(cb) {
      agent.get('/api/user/list')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          const list = res.body;
          for (let i = 0; i < list.length; i++) {
            if (list[i].email === 'test@exampld.com') {
              if ((list[i + 1].email === 'test@example.com') &&
                  (list[i + 2].email === 'test@examplf.com')) {
                return void cb(null);
              }
            }
          }
          cb(Error('Default sorting error'));
        });
    },
    // Use name DESC and email ASC sort.
    function(cb) {
      const opts = {
        contains: 'exampl',
        fields: fields,
        sort: 'name:desc,email:asc'
      };
      agent.get('/api/user/list')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .query(opts).expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          const list = res.body;
          for (let i = 0; i < list.length; i++) {
            if (list[i].name === 'Test') {
              if ((list[i].email === 'test@exampld.com') &&
                  (list[i + 1].name === 'Test') &&
                  (list[i + 1].email === 'test@example.com') &&
                  (list[i + 2].name === 'Tess')) {
                return void cb(null);
              }
            }
          }
          cb(Error('Name sorting error'));
        });
    },
    // Get the specified email.
    function(cb) {
      const opts = { email: testParams.user.user.email };
      agent.get('/api/user/list')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .query(opts).expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          }
          const list = res.body;
          if ((list.length !== 1) || (list[0].email !== opts.email)) {
            return void cb(Error('Get specified email error'));
          }
          cb(null);
        });
    }
  ], function(err) {
    // Remove test users.
    agent.delete(`/api/user/${newUserInfo1.userId}`)
      .set('Authorization', `Bearer ${tokenUaCa}`)
      .expect(200).end(function(e, res) {

        agent.delete(`/api/user/${newUserInfo2.userId}`)
          .set('Authorization', `Bearer ${tokenUaCa}`)
          .expect(200).end(function(e, res) {

            agent.delete(`/api/user/${newUserInfo3.userId}`)
              .set('Authorization', `Bearer ${tokenUaCa}`)
              .expect(200).end(function(e, res) {
                done(err);
              });
          });
      });
  });
};

/**
 * `GET /api/user/list` with paging.
 */
module.exports.getUserListPage = function(done) {
  let userIds = [];
  const START = 100;
  const END = 110;
  async.waterfall([
    // Create dealers for test.
    function(cb) {
      let index = START;
      (function func() {
        const newDealer = {
          email: `testtest${index}@testtest.com`,
          password: 'test',
          name: `TesttEST usER ${index}`
        };
        agent.post('/api/user')
          .set('Authorization', `Bearer ${tokenUaCa}`)
          .send(newDealer).expect(200).end(function(err, res) {
            if (err) {
              return void cb(err);
            }
            userIds.push(res.body.userId);
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
        contains: 'testtest',
        num: 3,
        p: 2
      };
      agent.get('/api/user/list')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .query(opts).expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if ((res.body[0].name !== ('TesttEST usER ' + (START + 3))) ||
              (res.body[1].name !== ('TesttEST usER ' + (START + 4))) ||
              (res.body[2].name !== ('TesttEST usER ' + (START + 5)))) {
            return void cb(Error('Get middle 3 items fail'));
          }
          cb(null);
        });
    },
    // Get tail items that the limit is larger than remaining items.
    function(cb) {
      const opts = {
        contains: 'testtest',
        num: 3,
        p: 4
      };
      agent.get('/api/user/list')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .query(opts).expect(200).end(function(err, res) {
          if (err) {
            return void cb(err);
          } else if ((res.body.length !== 1) ||
              (res.body[0].name !== ('TesttEST usER ' + (END - 1)))) {
            return void cb(Error('Get last items fail'));
          }
          cb(null);
        });
    },
    // Remove dealers.
    function(cb) {
      let index = 0;
      (function func() {
        agent.delete(`/api/user/${userIds[index]}`)
          .set('Authorization', `Bearer ${tokenUaCa}`)
          .expect(200).end(function(err, res) {
            if (err) {
              return void cb(err);
            }
            ++index;
            if (index >= userIds.length) {
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
 * `GET /api/user/list` with invalid parameters.
 */
module.exports.getUserListInvalid = function(done) {
  async.waterfall([
    // Send invalid num.
    function(cb) {
      agent.get('/api/user/list')
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
      agent.get('/api/user/list')
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
    },
    // Send invalid fields.
    function(cb) {
      agent.get('/api/user/list')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .query({ fields: 'asd' }).expect(400).end(function(err, res) {
          if (err) {
            return void done(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void done(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('fields') < 0) {
            return void cb(Error('Should respond fields error message'));
          }
          cb(null);
        });
    },
    // Send invalid sort with invalid pair.
    function(cb) {
      agent.get('/api/user/list')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .query({ sort: 'a' }).expect(400).end(function(err, res) {
          if (err) {
            return void done(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void done(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('sort') < 0) {
            return void cb(Error('Should respond sort error message'));
          }
          cb(null);
        });
    },
    // Send invalid sort with invalid sort key.
    function(cb) {
      agent.get('/api/user/list')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .query({ sort: 'email:asc,a:asc' }).expect(400).end(function(err, res) {
          if (err) {
            return void done(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void done(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('sort') < 0) {
            return void cb(Error('Should respond sort error message'));
          }
          cb(null);
        });
    },
    // Send invalid sort with invalid sort value.
    function(cb) {
      agent.get('/api/user/list')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .query({ sort: 'email:dsc' }).expect(400).end(function(err, res) {
          if (err) {
            return void done(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void done(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('sort') < 0) {
            return void cb(Error('Should respond sort error message'));
          }
          cb(null);
        });
    },
    // Send invalid sort with duplicate sort keys.
    function(cb) {
      agent.get('/api/user/list')
        .set('Authorization', `Bearer ${tokenUaCa}`)
        .query({ sort: 'name:asc,name:asc' }).expect(400)
        .end(function(err, res) {
          if (err) {
            return void done(err);
          } else if (res.body.code !== errid.EPARAM.obj.code) {
            return void done(Error('Should respond EPARAM error code'));
          } else if (res.body.message.indexOf('sort') < 0) {
            return void cb(Error('Should respond sort error message'));
          }
          cb(null);
        });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * `GET /api/user/list` with invalid user.
 */
module.exports.getUserListInvalidPerm = function(done) {
  agent.get('/api/user/list')
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
