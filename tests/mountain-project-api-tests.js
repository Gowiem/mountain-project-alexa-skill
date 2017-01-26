const mountainProjectApi = require('../src/mountain-project-api');
const nock = require('nock');
const apiFixtures = require('../fixtures/api-fixtures.js')

const mockGetRoute = function() {
  nock('https://www.mountainproject.com')
    .get(/data/)
    .query(function(queryObject) {
      return queryObject['routeIds'] === '105846247';
    })
    .reply(200, JSON.stringify(apiFixtures.routeFixture));
};

module.exports = {
  setUp: function(callback) {
    this.subject = mountainProjectApi("dummy@email.com", "FAKE_API_KEY");
    callback();
  },
  testBuildUrlWithParams: function(test) {
    const url = this.subject._buildUrl('getRoute', { routeIds: '123' });
    test.ok(url.includes('routeIds=123'));
    test.done()
  },
  testGetRoute: function(test) {
    mockGetRoute();
    test.expect(1);
    this.subject.getRoute(105846247).then((getRouteResponse) => {
      test.deepEqual(getRouteResponse, apiFixtures.routeFixture);
      test.done();
    });
  },
  testGetRecentClimb: function(test) {

    nock('https://www.mountainproject.com')
      .get('/data')
      .query((queryObject) => {
        return queryObject['action'] === 'getTicks';
      })
      .reply(200, JSON.stringify(apiFixtures.ticksFixture));
    mockGetRoute();

    test.expect(1);
    this.subject.getRecentClimb().then((getRecentResponse) => {
      test.deepEqual(apiFixtures.routeFixture['routes'][0], getRecentResponse);
      test.done();
    });
  },
  testGetRecentTodos: function(test) {
    nock('https://www.mountainproject.com')
      .get('/data')
      .query((queryObject) => {
        return queryObject['action'] == 'getToDos';
      })
      .reply(200, JSON.stringify(apiFixtures.todosFixture));
    mockGetRoute();

    test.expect(1);
    this.subject.getRecentTodos().then((getTodosResponse) => {
      test.deepEqual(getTodosResponse, apiFixtures.routeFixture['routes'][0]);
      test.done();
    });
  }
};
