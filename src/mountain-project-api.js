'use strict';
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

const getRoutes = function(routeIds) {
  const routeIdsString = _.join(routeIds, ',') || routeIds;
  const getRoutesUrl = this._buildUrl('getRoutes', { 'routeIds': routeIdsString });
  return new Promise((fulfill, reject) => {
    request(getRoutesUrl, (error, response, bodyJson) => {
      if (!_.isEmpty(error)) {
        reject(error);
      } else {
        fulfill(JSON.parse(bodyJson));
      }
    });
  });
};

const getRecentTodos = function(count) {
  const getTodosUrl = this._buildUrl('getToDos');
  return new Promise((fulfill, reject) => {
    request(getTodosUrl, (error, response, bodyJson) => {
      if (error) {
        console.error(error);
        reject(error.message);
      } else {
        const body = JSON.parse(bodyJson);
        if (!_.isEmpty(body['toDos'])) {
          const routeIds = _.take(body['toDos'], count);
          this.getRoutes(routeIds).then((routesBody) => {
            fulfill(routesBody['routes']);
          }, reject);
        } else {
          fulfill([]);
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
    });
  });
};

const getRecentClimbs = function(count) {
  return new Promise((fulfill, reject) => {
    this.getTicks().then((ticksResponse) => {
      if (!_.isEmpty(ticksResponse['ticks'])) {
        const routeIds = _.map(_.take(ticksResponse['ticks'], count), 'routeId');
        this.getRoutes(routeIds).then((routesBody) => {
          const routes = routesBody['routes'];
          fulfill(routes);
        }, reject);
      } else {
        fulfill([]);
      }
    }, reject);
  });
};

module.exports = function(email, apiKey) {
  return {
    getRecentClimbs: getRecentClimbs,
    getRecentTodos: getRecentTodos,
    getTicks: getTicks,
    getRoutes: getRoutes,
    _buildUrl: buildUrlClosure(email, apiKey)
  };
};
