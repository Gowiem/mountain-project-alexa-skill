const _ = require('lodash');
const request = require('request');

const BASE_URL = 'https://www.mountainproject.com/data'

const buildUrlClosure = function(email, apiKey) {
  return function buildUrl(action, extraParams) {
    let url = `${BASE_URL}?action=${action}&key=${apiKey}&email=${email}`;

    if (!_.isEmpty(extraParams)) {
      url += "&" + _.map(extraParams, (value, key) => {
        return `${key}=${value}`;
      }).join('&');
    }

    return url;
  };
};

const getRoute = function(routeId) {
  const getRouteUrl = this._buildUrl('getRoutes', { routeIds: routeId });
  return new Promise((fulfill, reject) => {
    request(getRouteUrl, (error, response, bodyJson) => {
      fulfill(JSON.parse(bodyJson));
    });
  });
};

const getRecentTodos = function() {
  const getTodosUrl = this._buildUrl('getToDos');
  return new Promise((fulfill, reject) => {
    request(getTodosUrl, (error, response, bodyJson) => {
      if (error) {
        console.error(error);
        reject(error.message);
      } else {
        const body = JSON.parse(bodyJson);
        if (!_.isEmpty(body['toDos'])) {
          const routeId = body['toDos'][0];
          this.getRoute(routeId).then((routesBody) => {
            const route = routesBody['routes'][0];
            fulfill(route);
          }, reject);
        }
      }
    }, reject);
  });
};

const getTicks = function() {
  const getTicksUrl = this._buildUrl('getTicks');
  return new Promise((fulfill, reject) => {
    request(getTicksUrl, (error, response, bodyJson) => {
      if (error) {
        console.error(error.message);
        reject(error);
      } else {
        fulfill(JSON.parse(bodyJson));
      }
    }, reject);
  });
};

const getRecentClimb = function() {
  return new Promise((fulfill, reject) => {
    this.getTicks().then((ticksResponse) => {
      if (!_.isEmpty(ticksResponse['ticks'])) {
        const routeId = ticksResponse['ticks'][0]['routeId'];
        this.getRoute(routeId).then((routesBody) => {
          const route = routesBody['routes'][0];
          fulfill(route);
        }, reject);
      } else {
        reject("No Ticks for User");
      }
    });
  });
};

module.exports = function(email, apiKey) {
  return {
    getRecentClimb: getRecentClimb,
    getRecentTodos: getRecentTodos,
    getTicks: getTicks,
    getRoute: getRoute,
    _buildUrl: buildUrlClosure(email, apiKey)
  }
};
