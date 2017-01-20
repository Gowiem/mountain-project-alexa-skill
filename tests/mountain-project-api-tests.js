const mountainProjectApi = require('../src/mountain-project-api');
const nock = require('nock');

const getRouteExpected = {
  "routes": [{
    "id":"105846247",
    "name":"Left Banana Crack",
    "type":"Trad",
    "rating":"5.10b",
    "stars":"3.8",
    "starVotes":"46",
    "pitches":"1",
    "location":[
      "California",
      "Joshua Tree National Park",
      "Lost Horse Area",
      "Banana Cracks"
    ],
    "url":"https:\/\/www.mountainproject.com\/v\/left-banana-crack\/105846247",
    "imgSmall":"https:\/\/www.mountainproject.com\/images\/71\/36\/108567136_small_fd9db1.jpg",
    "imgMed":"https:\/\/www.mountainproject.com\/images\/71\/36\/108567136_medium_fd9db1.jpg"
  }],
  "success":1
};

const getTodosExpected = {
  "toDos":[
    "105846247",
  ],
  "success":1
}

const getRecentExpected = {
  "hardest":"5.11b",
  "average":"5.9",
  "ticks":[
    {
      "routeId":105846247,
      "date":"2017-01-18",
      "pitches":"1",
      "notes":"Flash with Chris. We sewed it up. Sick, hard climb. Stoked we both sent it."
    }
  ],
  "success":1
};

const mockGetRoute = function() {
  nock('https://www.mountainproject.com')
    .get(/data/)
    .query(function(queryObject) {
      return queryObject['routeIds'] === '105846247';
    })
    .reply(200, JSON.stringify(getRouteExpected));
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
      test.deepEqual(getRouteResponse, getRouteExpected);
      test.done();
    });
  },
  testGetRecentClimb: function(test) {

    nock('https://www.mountainproject.com')
      .get('/data')
      .query((queryObject) => {
        return queryObject['action'] === 'getTicks';
      })
      .reply(200, JSON.stringify(getRecentExpected));
    mockGetRoute();

    test.expect(1);
    this.subject.getRecentClimb().then((getRecentResponse) => {
      test.deepEqual(getRouteExpected['routes'][0], getRecentResponse);
      test.done();
    });
  },
  testGetRecentTodos: function(test) {
    nock('https://www.mountainproject.com')
      .get('/data')
      .query((queryObject) => {
        return queryObject['action'] == 'getToDos';
      })
      .reply(200, JSON.stringify(getTodosExpected));
    mockGetRoute();

    test.expect(1);
    this.subject.getRecentTodos().then((getTodosResponse) => {
      test.deepEqual(getTodosResponse, getRouteExpected['routes'][0]);
      test.done();
    });
  }
};
