/* eslint-disable  func-names */
/* eslint quote-props: ['error', 'consistent']*/
/**
 * This is an Alexa Skill to query the Mountain Project Data API (https://www.mountainproject.com/data)
 * It allows Alexa users to:
 *   - Ask about their recent climbs
 *   - Ask about their recent Todos
 *   - Ask about what their hardest grade was
 *   -
 **/

'use strict';

const MP_API_KEY = process.env.MOUNTAIN_PROJECT_API_KEY;
const APP_ID = process.env.APP_ID;
const REDIS_HOST = process.env.REDIS_HOST;

const _ = require('lodash');
const AlexaSdk = require('alexa-sdk');
const alexa = require('alexa-app');
const mountainProjectApi = require('./mountain-project-api')('gowie.matt@gmail.com', MP_API_KEY);
const redis = require("redis");

// Setup
const alexaApp = new alexa.app('mountain-project-alexa-skill');
const redisClient = redis.createClient({
  host: REDIS_HOST
});

// Setup MP Api instance + redis on alexaApp for testability.
alexaApp.mpApi = mountainProjectApi;
alexaApp.redisClient = redisClient;

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

// Helper functions

const logError = (error) => {
  console.error(error);
};

const recentClimbIntent = function(request, response) {
  alexaApp.mpApi.getRecentClimb().then((route) => {
    let result = `You climbed ${route['name']} at ${_.last(route['location'])}`;
    response.say(result).send();
  }, logError);
  return false;
};

const recentTodoIntent = function(request, response) {
  alexaApp.mpApi.getRecentTodos().then((route) => {
    console.log("ROUTE: ", route);
    let result = `You added ${route['name']} to your list of todos`;
    response.say(result).send();
  }, logError);
  return false;
};

const hardestGradeIntent = function(request, response) {
  alexaApp.mpApi.getTicks().then((ticksJson) => {
    if (!_.isEmpty(ticksJson['hardest'])) {
      let result = `Your hardest grade was rated ${ticksJson['hardest']}`;
      response.say(result).send();
    } else {
      response.say('You havent climbed anything yet!');
    }
  });
};

alexaApp.pre = function(request, response, type) {
  if (process.env.AWS_ENVIRONMENT !== 'development' && request['sessionDetails']['application']['applicationId'] != APP_ID) {
    // fail ungracefully
    console.error('Error -- Request: ', request);
    response.fail('Invalid applicationId');
  }
};

alexaApp.launch(recentClimbIntent);

alexaApp.intent('RecentClimb', {
    utterances: [
      'what are my recent climbs',
      'what did I climb recently',
      'what climbs was I on recently'
    ]
  }, recentClimbIntent);

alexaApp.intent('RecentTodo', {
    utterances: [
      'what are my recent todos',
      'what did I todo recently',
      'what climbs did I add to my todo list recently'
    ]
  }, recentTodoIntent);

alexaApp.intent('HardestGrade', {
    utterances: [
      'what was my hardest grade',
      'what is my hardest grade',
    ]
  }, hardestGradeIntent);

alexaApp.error = function(exception, request, response) {
  console.error(exception);
  response.say('Sorry, something bad happened!');
};

exports.handler = alexaApp.lambda();
exports.intentTesting = function(mockMpApi) {
  alexaApp.mpApi = mockMpApi;
  alexaApp.redisClient.end(true);
  return {
    recentClimbIntent: recentClimbIntent,
    recentTodoIntent: recentTodoIntent,
    hardestGradeIntent: hardestGradeIntent
  };
};
