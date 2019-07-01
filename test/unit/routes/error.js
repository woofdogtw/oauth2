'use strict';

let agent;

/**
 * Initialize request agent. Call this before all test.
 *
 * @param {Object} _agent The Express app object to be used.
 */
module.exports.init = function(_agent) {
  agent = _agent;
};

/**
 * Test non-exist API.
 */
module.exports.wrongApi = function(done) {
  agent.get('/testtest').expect(404).end(function(err, res) {
    if (err) {
      return void done(err);
    } else if (res.text.length > 0) {
      return void done(Error('Must empty body'));
    }
    done(null);
  });
};

/**
 * Test JSON format error.
 */
module.exports.json = function(done) {
  agent.post('/api/session/login')
    .set('Content-Type', 'application/json').send('{').expect(400)
    .end(function(err, res) {
      if (err) {
        return void done(err);
      } else if (res.body.code !== 'EPARAM') {
        return void done(Error('Cannot handle JSON format error'));
      }
      done(null);
    });
};
