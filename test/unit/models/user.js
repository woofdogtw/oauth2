'use strict';

const _     = require('lodash');
const async = require('async');

const testParams = require('../../test-params');
let oauthModel;
let testModel;
let userCount;

/**
 * Initialize model object. Call this before all test.
 *
 * @param {Object} model The model object to be used.
 */
module.exports.init = function(model) {
  oauthModel = model.oauth;
  testModel = model.user;
  userCount = Object.keys(testParams.user).length;
};

/**
 * Test `user.getUser(userId, opts)` without options.
 */
module.exports.getUser = function(done) {
  const u = testParams.user.user;
  testModel.getUser(u.userId, function(err, user) {
    if (err) {
      return void done(err);
    } else if (!user) {
      return void done(Error('Cannot get user'));
    } else if (('expired' in user) || ('disabled' in user) ||
        ('roles' in user) || ('password' in user)) {
      return void done(Error('Should not get hide fields'));
    } else if ((user.userId !== u.userId) || (user.email !== u.email) ||
        !_.isEqual(user.created, u.created) ||
        !_.isEqual(user.validated, u.validated) ||
        (user.name !== u.name) || (!_.isEqual(user.info, u.info))) {
      return void done(Error('User content is not the same as inserted'));
    }
    done(null);
  });
};

/**
 * Test `user.getUser(userId, opts)` with options.
 */
module.exports.getUserOpts = function(done) {
  const u = testParams.user.user;
  const opts = {
    fields: {
      expired: true,
      disabled: true,
      roles: true,
      info: true
    }
  };
  testModel.getUser(u.userId, opts, function(err, user) {
    if (err) {
      return void done(err);
    } else if (!user) {
      return void done(Error('Cannot get user'));
    } else if ('password' in user) {
      return void done(Error('Should not get hide fields'));
    } else if ((user.userId !== u.userId) || (user.email !== u.email) ||
        !_.isEqual(user.created, u.created) ||
        !_.isEqual(user.validated, u.validated) ||
        !_.isEqual(user.expired, u.expired) ||
        (user.disabled !== u.disabled) || !_.isEqual(user.roles, u.roles) ||
        (user.name !== u.name) || !_.isEqual(user.info, u.info)) {
      return void done(Error('User content is not the same as inserted'));
    }
    done(null);
  });
};

/**
 * Test `user.getUser(userId, opts)` with wrong user ID.
 */
module.exports.getUserWrong = function(done) {
  testModel.getUser(`${testParams.user.user.userId}1`, function(err, user) {
    if (err) {
      return void done(err);
    } else if (user) {
      return void done(Error('Get user which does not exist'));
    }
    done(null);
  });
};

/**
 * Test `user.getUser(userId, opts)` with invalid parameters.
 */
module.exports.getUserInvalid = function(done) {
  testModel.getUser(123, function(err, user) {
    if (!err) {
      return void done(Error('Cannot check invalid parameters'));
    } else if (err.message.indexOf('ValidationError') < 0) {
      return void done(Error('Not a validator error'));
    }
    done(null);
  });
};

/**
 * Test `user.addUser(user)` with complete info.
 */
module.exports.addUser = function(done) {
  const newUserInfo = {
    email: 'TEST-add@example.org',
    roles: { test: true, test2: false },
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
      testModel.addUser(newUserInfo, function(err, userId) {
        cb(err, userId);
      });
    },
    // Check if the user is inserted correctly.
    function(userId, cb) {
      const opts = {
        fields: {
          expired: true,
          disabled: true,
          roles: true
        }
      };
      testModel.getUser(userId, opts, function(err, user) {
        if (err) {
          return void cb(err);
        } else if (!user) {
          return void cb(Error('Cannot get new user'));
        } else if ((user.userId !== userId) ||
            (user.email !== newUserInfo.email.toLowerCase()) ||
            !(user.created instanceof Date) || (user.validated !== null) ||
            !(user.expired instanceof Date) || (user.disabled !== false) ||
            !_.isEqual(user.roles, newUserInfo.roles) ||
            (user.name !== newUserInfo.name) ||
            !_.isEqual(user.info, newUserInfo.info)) {
          return void cb(Error('User content is not the same as inserted'));
        }
        cb(null, userId);
      });
    },
    // Check if the user name and password is correct.
    function(userId, cb) {
      const email = newUserInfo.email;
      const password = newUserInfo.password;
      oauthModel.getUser(email, password, function(err, user) {
        if (err) {
          return void cb(err);
        } else if (!user) {
          return void cb(Error('Cannot get the user by name and password'));
        } else if (user.userId !== userId) {
          return void cb(Error('Get wrong user with incorrect user ID'));
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
 * Test `user.addUser(user)` with default info.
 */
module.exports.addUserDefault = function(done) {
  const newUserInfo = {
    email: 'TEST-add2@example.org',
    password: 'testtest'
  };

  async.waterfall([
    // Add a user.
    function(cb) {
      testModel.addUser(newUserInfo, function(err, userId) {
        cb(err, userId);
      });
    },
    // Check if the user is inserted correctly.
    function(userId, cb) {
      const opts = {
        fields: {
          expired: true,
          disabled: true,
          roles: true
        }
      };
      testModel.getUser(userId, opts, function(err, user) {
        if (err) {
          return void cb(err);
        } else if (!user) {
          return void cb(Error('Cannot get new user'));
        } else if ((user.userId !== userId) ||
            (user.email !== newUserInfo.email.toLowerCase()) ||
            !(user.created instanceof Date) || (user.validated !== null) ||
            !(user.expired instanceof Date) || (user.disabled !== false) ||
            !_.isEqual(user.roles, {}) || (user.name !== '') ||
            !_.isEqual(user.info, {})) {
          return void cb(Error('User content is not the same as inserted'));
        }
        cb(null, userId);
      });
    },
    // Check if the user name and password is correct.
    function(userId, cb) {
      const email = newUserInfo.email;
      const password = newUserInfo.password;
      oauthModel.getUser(email, password, function(err, user) {
        if (err) {
          return void cb(err);
        } else if (!user) {
          return void cb(Error('Cannot get the user by name and password'));
        } else if (user.userId !== userId) {
          return void cb(Error('Get wrong user with incorrect user ID'));
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
 * Test `user.addUser(user)` with invalid parameters.
 */
module.exports.addUserInvalid = function(done) {
  const newUserStr = JSON.stringify({
    email: 'TEST-add3@localhost.com',
    password: 'testtest'
  });

  async.waterfall([
    // Send invalid email.
    function(cb) {
      let newUser = JSON.parse(newUserStr);
      newUser.email = 'TEST-add3@';
      testModel.addUser(newUser, function(err, userId) {
        if (!err || (err.message.indexOf('email') < 0)) {
          return void cb(Error('Cannot check invalid parameters'));
        } else if (err.message.indexOf('ValidationError') < 0) {
          return void cb(Error('Not a validator error'));
        }
        cb(null);
      });
    },
    // Send invalid roles.
    function(cb) {
      let newUser = JSON.parse(newUserStr);
      newUser.roles = { $: true };
      testModel.addUser(newUser, function(err, userId) {
        if (!err || (err.message.indexOf('roles') < 0)) {
          return void cb(Error('Cannot check invalid parameters'));
        } else if (err.message.indexOf('ValidationError') < 0) {
          return void cb(Error('Not a validator error'));
        }
        cb(null);
      });
    },
    // Send invalid password.
    function(cb) {
      let newUser = JSON.parse(newUserStr);
      newUser.password = '';
      testModel.addUser(newUser, function(err, userId) {
        if (!err || (err.message.indexOf('password') < 0)) {
          return void cb(Error('Cannot check invalid parameters'));
        } else if (err.message.indexOf('ValidationError') < 0) {
          return void cb(Error('Not a validator error'));
        }
        cb(null);
      });
    },
    // Send invalid name.
    function(cb) {
      let newUser = JSON.parse(newUserStr);
      newUser.name = 1;
      testModel.addUser(newUser, function(err, userId) {
        if (!err || (err.message.indexOf('name') < 0)) {
          return void cb(Error('Cannot check invalid parameters'));
        } else if (err.message.indexOf('ValidationError') < 0) {
          return void cb(Error('Not a validator error'));
        }
        cb(null);
      });
    },
    // Send invalid info.
    function(cb) {
      let newUser = JSON.parse(newUserStr);
      newUser.info = [];
      testModel.addUser(newUser, function(err, userId) {
        if (!err || (err.message.indexOf('info') < 0)) {
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
 * Test `user.rmUser(userId)`.
 */
module.exports.rmUser = function(done) {
  const newUserInfo = {
    email: 'TEST-rm@example.org',
    password: 'testtest'
  };

  async.waterfall([
    // Add a user.
    function(cb) {
      testModel.addUser(newUserInfo, function(err, userId) {
        cb(err, userId);
      });
    },
    // Check if the user is inserted.
    function(userId, cb) {
      testModel.getUser(userId, function(err, user) {
        if (err) {
          return void cb(err);
        } else if (!user) {
          return void cb(Error('The user is not inserted'));
        }
        cb(null, userId);
      });
    },
    // Remove the user.
    function(userId, cb) {
      testModel.rmUser(userId, function(err) {
        cb(err, userId);
      });
    },
    // Check if the user is removed.
    function(userId, cb) {
      testModel.getUser(userId, function(err, user) {
        if (err) {
          return void cb(err);
        } else if (user) {
          return void cb(Error('The user is not removed'));
        }
        cb(null);
      });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * Test `user.rmUser(userId)` with invalid user ID.
 */
module.exports.rmUserInvalidId = function(done) {
  testModel.rmUser(123, function(err) {
    if (!err) {
      return void done(Error('Cannot check invalid parameters'));
    } else if (err.message.indexOf('ValidationError') < 0) {
      return void done(Error('Not a validator error'));
    }
    done(null);
  });
};

/**
 * Test `user.updateUser(userId, updates)`.
 */
module.exports.updateUser = function(done) {
  const newUserInfo = {
    email: 'TEST-update@example.org',
    password: 'testtest'
  };
  const updates = {
    validated: new Date(),
    expired: null,
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
      testModel.addUser(newUserInfo, function(err, userId) {
        cb(err, userId);
      });
    },
    // Check if the user is inserted.
    function(userId, cb) {
      testModel.getUser(userId, function(err, user) {
        if (err) {
          return void cb(err);
        } else if (!user) {
          return void cb(Error('The user is not inserted'));
        }
        cb(null, userId);
      });
    },
    // Update the user.
    function(userId, cb) {
      testModel.updateUser(userId, updates, function(err) {
        cb(err, userId);
      });
    },
    // Check if the user is updated.
    function(userId, cb) {
      const opts = {
        fields: {
          expired: true,
          disabled: true,
          roles: true,
          info: true
        }
      };
      testModel.getUser(userId, opts, function(err, user) {
        if (err) {
          return void cb(err);
        } else if (!user) {
          return void cb(Error('Cannot get the user'));
        } else if ((user.userId !== userId) ||
            !_.isEqual(user.validated, updates.validated) ||
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
      testModel.updateUser(userId, { disabled: false }, function(err) {
        cb(err, userId);
      });
    },
    // Check if the user name and password is correct.
    function(userId, cb) {
      const email = newUserInfo.email;
      const password = updates.password;
      oauthModel.getUser(email, password, function(err, user) {
        if (err) {
          return void cb(err);
        } else if (!user) {
          return void cb(Error('Cannot get the user by name and password'));
        } else if (user.userId !== userId) {
          return void cb(Error('Get wrong user with incorrect user ID'));
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
 * Test `user.updateUser(userId, updates)` with invalid user ID.
 */
module.exports.updateUserInvalidId = function(done) {
  testModel.updateUser(123, {}, function(err) {
    if (!err) {
      return void done(Error('Cannot check invalid parameters'));
    } else if (err.message.indexOf('ValidationError') < 0) {
      return void done(Error('Not a validator error'));
    }
    done(null);
  });
};

/**
 * Test `user.updateUser(userId, updates)` with invalid parameters.
 */
module.exports.updateUserInvalid = function(done) {
  async.waterfall([
    // Send no parameter.
    function(cb) {
      testModel.updateUser('123', {}, function(err) {
        if (!err) {
          return void cb(Error('Cannot check invalid parameters'));
        } else if (err.message.indexOf('ValidationError') < 0) {
          return void cb(Error('Not a validator error'));
        }
        cb(null);
      });
    },
    // Send invalid validated.
    function(cb) {
      testModel.updateUser('123', { validated: Date.now() }, function(err) {
        if (!err || (err.message.indexOf('validated') < 0)) {
          return void cb(Error('Cannot check invalid parameters'));
        } else if (err.message.indexOf('ValidationError') < 0) {
          return void cb(Error('Not a validator error'));
        }
        cb(null);
      });
    },
    // Send invalid expired.
    function(cb) {
      testModel.updateUser('123', { expired: new Date() }, function(err) {
        if (!err || (err.message.indexOf('expired') < 0)) {
          return void cb(Error('Cannot check invalid parameters'));
        } else if (err.message.indexOf('ValidationError') < 0) {
          return void cb(Error('Not a validator error'));
        }
        cb(null);
      });
    },
    // Send invalid disabled.
    function(cb) {
      testModel.updateUser('123', { disabled: 1 }, function(err) {
        if (!err || (err.message.indexOf('disabled') < 0)) {
          return void cb(Error('Cannot check invalid parameters'));
        } else if (err.message.indexOf('ValidationError') < 0) {
          return void cb(Error('Not a validator error'));
        }
        cb(null);
      });
    },
    // Send invalid roles.
    function(cb) {
      testModel.updateUser('123', { roles: { a$: true } }, function(err) {
        if (!err || (err.message.indexOf('roles') < 0)) {
          return void cb(Error('Cannot check invalid parameters'));
        } else if (err.message.indexOf('ValidationError') < 0) {
          return void cb(Error('Not a validator error'));
        }
        cb(null);
      });
    },
    // Send invalid password.
    function(cb) {
      testModel.updateUser('123', { password: '' }, function(err) {
        if (!err || (err.message.indexOf('password') < 0)) {
          return void cb(Error('Cannot check invalid parameters'));
        } else if (err.message.indexOf('ValidationError') < 0) {
          return void cb(Error('Not a validator error'));
        }
        cb(null);
      });
    },
    // Send invalid name.
    function(cb) {
      testModel.updateUser('123', { name: 1 }, function(err) {
        if (!err || (err.message.indexOf('name') < 0)) {
          return void cb(Error('Cannot check invalid parameters'));
        } else if (err.message.indexOf('ValidationError') < 0) {
          return void cb(Error('Not a validator error'));
        }
        cb(null);
      });
    },
    // Send invalid info.
    function(cb) {
      testModel.updateUser('123', { info: [] }, function(err) {
        if (!err || (err.message.indexOf('info') < 0)) {
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
 * Test `user.getUserCount(opts)` without options.
 */
module.exports.getUserCount = function(done) {
  testModel.getUserCount(function(err, count) {
    if (err) {
      return void done(err);
    } else if (count !== userCount) {
      return void done(Error(`Count must be ${userCount}, not ${count}`));
    }
    done(null);
  });
};

/**
 * Test `user.getUserCount(opts)` with conditions.
 */
module.exports.getUserCountCond = function(done) {
  const newUserInfo = {
    email: 'TEST-contains@abc.com',
    password: 'testtest'
  };

  async.waterfall([
    // Add a user.
    function(cb) {
      testModel.addUser(newUserInfo, function(err, userId) {
        cb(err, userId);
      });
    },
    // Check if the new user is not effect the search result.
    function(userId, cb) {
      const opts = {
        cond: {
          email: testParams.user.user.email
        }
      };
      testModel.getUserCount(opts, function(err, count) {
        if (err) {
          return void cb(err);
        } else if (count !== 1) {
          return void done(Error(`Count must be 1, not ${count}`));
        }
        cb(null, userId);
      });
    },
    // Check if the new user is not effect the search result.
    function(userId, cb) {
      const opts = {
        cond: {
          contains: 'example'
        }
      };
      testModel.getUserCount(opts, function(err, count) {
        if (err) {
          return void cb(err);
        } else if (count !== userCount) {
          return void done(Error(`Count must be ${userCount}, not ${count}`));
        }
        cb(null, userId);
      });
    },
    // Remove the temporary user.
    function(userId, cb) {
      testModel.rmUser(userId, function(err) {
        cb(err);
      });
    }
  ], function(err) {
    done(err);
  });
};

/**
 * Test `user.getUserList(opts)` with specified email.
 */
module.exports.getUserListEmail = function(done) {
  const opts = {
    cond: {
      email: testParams.user.user.email
    }
  };
  testModel.getUserList(opts, function(err, list) {
    if (err) {
      return void done(err);
    } else if ((list.length !== 1) || (list[0].email !== opts.cond.email)) {
      return void done(Error('Wrong list content'));
    }
    done(null);
  });
};

/**
 * Test `user.getUserList(opts)` sorting.
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
  const fields = {
    expired: true,
    disabled: true,
    roles: true
  };

  async.waterfall([
    // Insert users for test sorting.
    function(cb) {
      testModel.addUser(newUserInfo1, function(err, userId) {
        if (err) {
          return void cb(err);
        }
        newUserInfo1.userId = userId;

        testModel.addUser(newUserInfo2, function(err, userId) {
          if (err) {
            return void cb(err);
          }
          newUserInfo2.userId = userId;

          testModel.addUser(newUserInfo3, function(err, userId) {
            if (err) {
              return void cb(err);
            }
            newUserInfo3.userId = userId;
            cb(null);
          });
        });
      });
    },
    // Use default sort.
    function(cb) {
      testModel.getUserList(function(err, list) {
        if (err) {
          return void cb(err);
        }
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
        cond: { contains: 'exampl' },
        fields: fields,
        sort: [ { key: 'name', asc: false }, { key: 'email' } ]
      };
      testModel.getUserList(opts, function(err, list) {
        if (err) {
          return void cb(err);
        }
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
    }
  ], function(err) {
    // Remove test users.
    testModel.rmUser(newUserInfo1.userId, function(e) {
      testModel.rmUser(newUserInfo2.userId, function(e) {
        testModel.rmUser(newUserInfo3.userId, function(e) {
          done(err);
        });
      });
    });
  });
};

/**
 * Test `user.getUserList(opts)` paging.
 */
module.exports.getUserListPage = function(done) {
  let userList = [];
  const START = 100;
  const END = 110;
  async.waterfall([
    // Insert data.
    function(cb) {
      let index = START;
      (function insert() {
        let newUser = {
          email: `${index}@localhost.com`,
          password: 'test'
        };
        testModel.addUser(newUser, function(err, userId) {
          if (err) {
            return void cb(err);
          }
          newUser.userId = userId;
          userList.push(newUser);
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
      const opts = { cond: { contains: 'localhost.com' }, skip: 4, limit: 3 };
      testModel.getUserList(opts, function(err, list) {
        if (err) {
          return void cb(err);
        } else if ((list[0].email !== (START + 4 + '@localhost.com')) ||
            (list[1].email !== (START + 5 + '@localhost.com')) ||
            (list[2].email !== (START + 6 + '@localhost.com'))) {
          return void cb(Error('Get middle 3 items fail'));
        }
        cb(null);
      });
    },
    // Get tail items that the limit is larger than remaining items.
    function(cb) {
      const opts = {
        cond: { contains: 'localhost.com' },
        skip: (END - START - 2),
        limit: 3
      };
      testModel.getUserList(opts, function(err, list) {
        if (err) {
          return void cb(err);
        } else if ((list.length !== 2) ||
            (list[0].email !== (END - 2 + '@localhost.com')) ||
            (list[1].email !== (END - 1 + '@localhost.com'))) {
          return void cb(Error('Get last items fail'));
        }
        cb(null);
      });
    },
    // Remove users.
    function(cb) {
      let index = START;
      (function remove() {
        testModel.rmUser(userList[index - 100].userId, function(err) {
          index++;
          if (!userList[index - 100]) {
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
