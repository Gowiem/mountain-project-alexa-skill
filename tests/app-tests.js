const apiFixtures = require('../fixtures/api-fixtures');
const app = require('../src/app.js');

const mockMpApi = {
  getRecentClimb: () => {
    return new Promise((fulfill) => {
      fulfill(apiFixtures.routeFixture['routes'][0]);
    });
  },
  getRecentTodos: () => {
    return new Promise((fulfill) => {
      fulfill(apiFixtures.routeFixture['routes'][0]);
    });
  },
  getTicks: () => {
    return new Promise((fulfill) => {
      fulfill(apiFixtures.ticksFixture);
    });
  },
  getRoute: () => {
    return new Promise((fulfill) => {
      fulfill(apiFixtures.routeFixture);
    });
  },
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

module.exports = {
  setUp: function(callback) {
    this.subject = app.intentTesting(mockMpApi);
    callback();
  },
  testRecentClimbIntent: function(test) {
    let testResponse = mockResponse();

    test.expect(1);
    testResponse.onComplete = () => {
      test.equal(testResponse.sayResult, "You climbed Left Banana Crack at Banana Cracks");
      test.done();
    };

    this.subject.recentClimbIntent(null, testResponse);
  },
  testRecentTodosIntent: function(test) {
    let testResponse = mockResponse();

    test.expect(1);
    testResponse.onComplete = () => {
      test.equal(testResponse.sayResult, "You added Left Banana Crack to your list of todos");
      test.done();
    };

    this.subject.recentTodoIntent(null, testResponse);
  },
  testHardestGradeIntent: function(test) {
    let testResponse = mockResponse();

    test.expect(1);
    testResponse.onComplete = () => {
      test.equal(testResponse.sayResult, "Your hardest grade was rated 5.11b");
      test.done();
    };

    this.subject.hardestGradeIntent(null, testResponse);
  }
};
