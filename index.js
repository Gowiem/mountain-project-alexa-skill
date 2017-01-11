/* eslint-disable  func-names */
/* eslint quote-props: ["error", "consistent"]*/
/**
 * This is an Alexa Skill to query the Mountain Project Data API (https://www.mountainproject.com/data)
 * It allows Alexa users to:
 *   - Ask about their recent climbs
 *   - TODO
 **/

'use strict';

const Alexa = require('alexa-sdk');
const MountainProjectApiKey = process.env.MOUNTAIN_PROJECT_API_KEY;

let request = require('request');

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
  const getRouteUrl = `https://www.mountainproject.com/data?action=getRoutes&routeIds=${routeId}&key=${MountainProjectApiKey}`
  return new Promise(function (fulfill, reject) {
    request(getRouteUrl, (error, response, body) => {
      fulfill(JSON.parse(body));
    });
  });
}

const handlers = {
  'LaunchRequest': function () {
    this.emit('GetRecentClimb');
  },
  'RecentClimb': function () {
    this.emit('GetRecentClimb');
  },
  'GetRecentClimb': function () {
    const url = `https://www.mountainproject.com/data?action=getTicks&email=gowie.matt@gmail.com&key=${MountainProjectApiKey}`;
    let alexa = this;
    request(url, function(error, response, bodyJson) {
      var result = '';
      const statusCode = response.statusCode;
      const contentType = response.headers['content-type'];

      if (error) {
        console.error(error.message);
        result = this.t('ERROR_MESSAGE');
        this.emit(':tell', result);
        return;
      } else {
        let body = JSON.parse(bodyJson);
        if (body && body['ticks'] && body['ticks'].length > 0) {
          let routeId = body['ticks'][0]['routeId'];
          getRoute(routeId).then(function(routesBody) {
            let route = routesBody['routes'][0];
            result = `You climbed ${route['name']} at ${route['location'][route['location'].length - 1]}`;
            console.log("RESULT: ", result);
            alexa.emit(':tell', result);
          });
        } else {
          // TODO
        }
      }
    });
  },
  'AMAZON.HelpIntent': function () {
    const speechOutput = this.t('HELP_MESSAGE');
    const reprompt = this.t('HELP_MESSAGE');
    this.emit(':ask', speechOutput, reprompt);
  },
  'AMAZON.CancelIntent': function () {
    this.emit(':tell', this.t('STOP_MESSAGE'));
  },
  'AMAZON.StopIntent': function () {
    this.emit(':tell', this.t('STOP_MESSAGE'));
  },
  'SessionEndedRequest': function () {
    this.emit(':tell', this.t('STOP_MESSAGE'));
  },
};

exports.handler = (event, context) => {
  const alexa = Alexa.handler(event, context);
  console.log("Event: ", event);
  alexa.appId = process.env.APP_ID;

  // To enable string internationalization (i18n) features, set a resources object.
  alexa.resources = languageStrings;
  alexa.registerHandlers(handlers);
  alexa.execute();
};
