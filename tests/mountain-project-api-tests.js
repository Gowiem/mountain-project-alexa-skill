const mountainProjectApi = require('../src/mountain-project-api');
const nock = require('nock');
const apiFixtures = require('../fixtures/api-fixtures.js');
const _ = require('lodash');

const mockGetRoutes = function(count) {
  const result = _.set(apiFixtures.routeFixture, 'routes', _.take(apiFixtures.routeFixture['routes'], count));
  nock('https://www.mountainproject.com')
    .get(/data/)
    .query(function(queryObject) {
      return queryObject['routeIds'] === '105846247';
    })
    .reply(200, JSON.stringify(result));
};

module.exports = {
  setUp: function(callback) {
    this.subject = mountainProjectApi("dummy@email.com", "FAKE_API_KEY");
    callback();
  },
  testBuildUrlWithParams: function(test) {
    const url = this.subject._buildUrl('getRoutes', { routeIds: '123' });
    test.ok(url.includes('routeIds=123'));
    test.done()
  },
  testGetRoutes: function(test) {
    mockGetRoutes();
    test.expect(1);
    this.subject.getRoutes(105846247).then((getRoutesResponse) => {
      test.deepEqual(getRoutesResponse, apiFixtures.routeFixture);
      test.done();
    });
  },
  testgetRecentClimbs: function(test) {

    nock('https://www.mountainproject.com')
      .get('/data')
      .query((queryObject) => {
        return queryObject['action'] === 'getTicks';
      })
      .reply(200, JSON.stringify(apiFixtures.ticksFixture));

    const count = 1;
    mockGetRoutes(count);

    test.expect(1);
    this.subject.getRecentClimbs(count).then((getRecentResponse) => {
      test.deepEqual(apiFixtures.routeFixture['routes'], getRecentResponse);
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
    const count = 1;
    mockGetRoutes(count);

    test.expect(1);
    this.subject.getRecentTodos(count).then((getTodosResponse) => {
      test.deepEqual(getTodosResponse, apiFixtures.routeFixture['routes']);
      test.done();
    });
  }
};
