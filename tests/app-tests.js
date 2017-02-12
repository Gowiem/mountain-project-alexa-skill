const apiFixtures = require('../fixtures/api-fixtures');
const app = require('../src/app.js');
const _ = require('lodash');

const mockMpApi = function() {
  return {
    getRecentClimbs: (count) => {
      return new Promise((fulfill) => {
        fulfill(_.take(apiFixtures.routeFixture['routes'], count));
      });
    },
    getRecentTodos: (count) => {
      return new Promise((fulfill) => {
        fulfill(_.take(apiFixtures.routeFixture['routes'], count));
      });
    },
    getTicks: () => {
      return new Promise((fulfill) => {
        fulfill(apiFixtures.ticksFixture);
      });
    },
    getRoutes: () => {
      return new Promise((fulfill) => {
        fulfill(apiFixtures.routeFixture);
      });
    },
  };
};

const mockRedisClient = function() {
  return {
    get: (_, callback) => {
      callback(null, 'fake@email.com');
    },
    hset: (_1, _2, _3, callback) => {
      callback();
    },
    end: () => {}
  };
};

const mockResponse = function() {
  return {
    sayResult: null,
    onComplete: null,
    say: function(sayResult) {
      this.sayResult = sayResult;
      return this;
    },
    send: function() {
      this.onComplete();
    }
  };
};

const mockRequest = function(count) {
  return {
    slot: (name) => {
      if (name === 'COUNT') {
        return count;
      } else {
        return '1234';
      }
    },
    getSession: () => {
      return {
        details: {
          userId: 'user1'
        },
        get: () => {
          return 'fake@email.com';
        }
      };
    }
  };
};

module.exports = {
  setUp: function(callback) {
    this.subject = app.intentTesting(mockMpApi, mockRedisClient());
    callback();
  },
  testPairingFinalizeIntentBadPairingId: function(test) {
    let testResponse = mockResponse();
    let testRequest = mockRequest();

    // No pairing ID
    testRequest.slot = () => {
      return null;
    };

    test.expect(1)
    testResponse.onComplete = () => {
      test.equal(testResponse.sayResult, "Sorry, we couldn't understand that or had an internal issue. Please try again.");
      test.done();
    };

    this.subject.pairingFinalizeIntent(testRequest, testResponse);
  },
  testPairingFinalizeIntentTooOld: function(test) {
    let testResponse = mockResponse();
    let testRequest = mockRequest();

    let testRedisClient = mockRedisClient();
    testRedisClient.get = (key, cb) => {
      cb(null, null);
    };

    let subject = app.intentTesting(mockMpApi, testRedisClient);

    test.expect(1)
    testResponse.onComplete = () => {
      test.equal(testResponse.sayResult, 'Sorry, your pairing ID was too old. Please try pairing again.');
      test.done();
    };

    subject.pairingFinalizeIntent(testRequest, testResponse);
  },
  testPairingFinalizeIntentSuccess: function(test) {
    let testResponse = mockResponse();
    let testRequest = mockRequest();
    let testRedisClient = mockRedisClient();

    let subject = app.intentTesting(mockMpApi, testRedisClient);

    test.expect(1)
    testResponse.onComplete = () => {
      test.ok(testResponse.sayResult.includes('successfully paired'));
      test.done();
    };

    subject.pairingFinalizeIntent(testRequest, testResponse);
  },
  testRecentClimbIntentWithNoCount: function(test) {
    let testResponse = mockResponse();

    test.expect(1);
    testResponse.onComplete = () => {
      test.equal(testResponse.sayResult, "You recently climbed Left Banana Crack at Banana Cracks.");
      test.done();
    };

    this.subject.recentClimbIntent(mockRequest(1), testResponse);
  },

  testRecentClimbIntentWithCountOf2: function(test) {
    let testResponse = mockResponse();

    test.expect(1);
    testResponse.onComplete = () => {
      test.equal(testResponse.sayResult, 'You recently climbed Left Banana Crack at Banana Cracks, and Leap Year Flake at Dairy Queen Wall - Left Side.');
      test.done();
    };

    this.subject.recentClimbIntent(mockRequest(2), testResponse);
  },
  testRecentTodosIntentWithNoCount: function(test) {
    let testResponse = mockResponse();

    test.expect(1);
    testResponse.onComplete = () => {
      test.equal(testResponse.sayResult, 'You added the following to your toodoo list, Left Banana Crack at Banana Cracks.');
      test.done();
    };

    this.subject.recentTodoIntent(mockRequest(1), testResponse);
  },
  testRecentTodosIntentWithCountOf4: function(test) {
    let testResponse = mockResponse();

    test.expect(1);
    testResponse.onComplete = () => {
      test.equal(testResponse.sayResult, 'You added the following to your toodoo list, Left Banana Crack at Banana Cracks, Leap Year Flake at Dairy Queen Wall - Left Side, Fiddler on the Roof at Black Velvet Wall, and Weathering Frights at Baskerville Rock.');

      test.done();
    };

    this.subject.recentTodoIntent(mockRequest(4), testResponse);
  },
  testHardestGradeIntent: function(test) {
    let testResponse = mockResponse();

    test.expect(1);
    testResponse.onComplete = () => {
      test.equal(testResponse.sayResult, "Your hardest grade was rated 5.11b");
      test.done();
    };

    this.subject.hardestGradeIntent(mockRequest(), testResponse);
  }
};
