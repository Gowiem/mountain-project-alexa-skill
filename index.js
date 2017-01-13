/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
/**
 * This is an Alexa Skill to query the Mountain Project Data API (https://www.mountainproject.com/data)
 * It allows Alexa users to:
 *   - Ask about their recent climbs
 *   - TODO
 **/

'use strict';

const AlexaSdk = require('alexa-sdk');
let alexa = require("alexa-app");
let request = require('request');

var alexaApp = new alexa.app("mountain-project-alexa-skill");

const MOUNTAIN_PROJECT_API_KEY = process.env.MOUNTAIN_PROJECT_API_KEY;
const APP_ID = process.env.APP_ID

const languageStrings = {
  'en-US': {
    translation: {
      SKILL_NAME: 'Mountain Project Data',
      HELP_MESSAGE: 'You can say what are my recent climbs... What can I help you with?',
      HELP_REPROMPT: 'What can I help you with?',
      STOP_MESSAGE: 'Goodbye!',
      ERROR_MESSAGE: 'Sorry, something went wrong. Try again later!',
    },
  }
};

let getRoute = function(routeId) {
  const getRouteUrl = `https://www.mountainproject.com/data?action=getRoutes&routeIds=${routeId}&key=${MOUNTAIN_PROJECT_API_KEY}`
  return new Promise(function (fulfill, reject) {
    request(getRouteUrl, (error, response, body) => {
      fulfill(JSON.parse(body));
    });
  });
};

let getRecentClimb = function() {
  const url = `https://www.mountainproject.com/data?action=getTicks&email=gowie.matt@gmail.com&key=${MOUNTAIN_PROJECT_API_KEY}`;
  return new Promise(function(fulfill, reject) {
    request(url, function(error, response, bodyJson) {
      var result = '';
      const statusCode = response.statusCode;
      const contentType = response.headers['content-type'];

      if (error) {
        console.error(error.message);
        reject(error.message)
        return;
      } else {
        let body = JSON.parse(bodyJson);
        if (body && body['ticks'] && body['ticks'].length > 0) {
          let routeId = body['ticks'][0]['routeId'];
          getRoute(routeId).then(function(routesBody) {
            var route = routesBody['routes'][0];
            fulfill(route);
          });
        } else {
          reject("No Ticks for User");
        }
      }
    });
  });
};

alexaApp.pre = function(request, response, type) {
  if (process.env.AWS_ENVIRONMENT !== 'development' && request['sessionDetails']['application']['applicationId'] != APP_ID) {
    // fail ungracefully
    console.error("Error -- Request: ", request);
    response.fail("Invalid applicationId");
  }
};

alexaApp.launch(function(request, response) {
  var alexa = this;
  getRecentClimb().then(function(route) {
    let result = `You climbed ${route['name']} at ${route['location'][route['location'].length - 1]}`;
    console.log("RESULT: ", result);
    response.say(result).send();
  }, function(error) {
    console.error(error);
  });
  return false;
});

alexaApp.intent("RecentClimb", {
    utterances: [
      "what are my recent climbs",
      "what did I climb recently",
      "what climbs was I on recently"
    ]
  },
  function(request, response) {
    var alexa = this;
    getRecentClimb().then(function(route) {
      let result = `You climbed ${route['name']} at ${route['location'][route['location'].length - 1]}`;
      console.log("RESULT: ", result);
      response.say(result).send();
    }, function(error) {
      console.error(error);
    });
    return false;
  }
);

alexaApp.error = function(exception, request, response) {
  console.error(exception);
  response.say("Sorry, something bad happened!");
};

exports.handler = alexaApp.lambda();
