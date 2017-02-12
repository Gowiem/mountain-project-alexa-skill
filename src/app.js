/* eslint-disable  func-names */
/* eslint quote-props: ['error', 'consistent']*/
/**
 * This is an Alexa Skill to query the Mountain Project Data API (https://www.mountainproject.com/data)
 * It allows Alexa users to:
 *   - Ask about their recent climbs
 *   - Ask about their recent Todos
 *   - Ask about their hardest grade
 *   -
 **/

'use strict';

const MP_API_KEY = process.env.MOUNTAIN_PROJECT_API_KEY;
const APP_ID = process.env.APP_ID;
const REDIS_HOST = process.env.REDIS_HOST;

const USER_ID_TO_EMAILS_KEY = 'user_id_to_emails';
const DEFAULT_COUNT = 3;

const _ = require('lodash');
const AlexaSdk = require('alexa-sdk');
const alexa = require('alexa-app');
const mountainProjectApiCreator = require('./mountain-project-api');
const redis = require("redis");

// Setup
/////////
const alexaApp = new alexa.app('mountain-project-alexa-skill');

// Setup mountainProjectApiCreator on alexaApp for testability.
alexaApp.mountainProjectApiCreator = mountainProjectApiCreator;

// String Constants
const languageStrings = {
  'en-US': {
    translation: {
      SKILL_NAME: 'Mountain Project Skill',
      HELP_MESSAGE: 'You can say what are my recent climbs, \
                    what are my recent todos, what is my hardest grade?',
      HELP_REPROMPT: 'What can I help you with?',
      STOP_MESSAGE: 'Goodbye!',
      ERROR_MESSAGE: "Sorry, we couldn't understand that or had an internal issue. Please try again.",

      PAIRING_START: "To start with the Mountain Project skill, \
                      you'll need to pair your device so we can look up your stats. \
                      Go to <say-as interpret-as="spell-out">mp</say-as>skill dot com and follow \
                      the instructions to pair your email and device.",
      PAIRING_UNDO_DONE: "We have unpaired your Alexa account. Thank you.",
      PAIRING_TOO_OLD: 'Sorry, your pairing ID was too old. Please try pairing again.',
      PAIRING_SUCCESS: "You've successfully paired your device. \
                        You can now ask about your Mountain Project stats. \
                        Try asking Alexa about your recent climbs.",

      HAVENT_CLIMBED_YET: "You haven't climbed anything yet!",
    },
  }
};

// Helper functions

const getRedisClient = function() {
  if (_.isEmpty(alexaApp.redisClient)) {
    alexaApp.redisClient = redis.createClient({ host: REDIS_HOST });
    return alexaApp.redisClient;
  } else {
    return alexaApp.redisClient;
  }
}

const logError = function(error) {
  console.error(error);
};

const errorResponse = function(response) {
  return (error) => {
    logError(error);
    response.say(translate('ERROR_MESSAGE')).done();
  };
};

const getCount = function(possibleCount) {
  console.log("getCount: ", possibleCount);
  if (possibleCount) {
    return _.clamp(_.toNumber(possibleCount), 1, 5); // Clamp so Min: 1, Max: 5
  } else {
    return DEFAULT_COUNT;
  }
};

const buildRouteLocationStrings = function(routes) {
  return _.map(routes, (route, idx) => {
    let routeLocationString = ` ${route['name'] || 'Unknown'} at ${_.last(route['location']) || 'Unknown'}`;
    if (idx === routes.length - 1 && idx !== 0) {
      routeLocationString = ' and' + routeLocationString;
    }
    return routeLocationString;
  });
};

// NOTE: Not sure how to use Alexa SDK's translate function while using 'alexa-app', so
// making a quick translate function till I deal with that.
const translate = function(translationName) {
  return languageStrings['en-US']['translation'][translationName];
};

const getEmail = function(request) {
  return new Promise((fulfill, reject) => {
    // 1. Check for cached email in session, fulfill if found
    let email = request.getSession().get('email');
    if (!_.isEmpty(email)) {
      console.log('Got email from session! email: ', email);
      fulfill(email);
      return;
    }

    // 2. Check Redis, if not found then rejects
    let userId = request.getSession().details.userId;
    getRedisClient().hget(USER_ID_TO_EMAILS_KEY, userId, (err, emailFromRedis) => {
      if (!_.isEmpty(emailFromRedis)) {
        request.getSession().set('email', emailFromRedis);
        response.shouldEndSession(false);
        fulfill(emailFromRedis);
      } else {
        reject(err);
      }
    });
  });
};

// Intents
///////////

// Pairing intents
const pairingStartIntent = function(request, response) {
  response.say(translate('PAIRING_START')).send();
};

const pairingUndoIntent = function(request, response) {
  let userId = request.getSession().details.userId;
  getRedisClient().hget(USER_ID_TO_EMAILS_KEY, userId, (deleted) => {
    if (deleted) {
      request.getSession().set('email', null);
      request.shouldEndSession(true);
      response.say(translate('PAIRING_UNDO_DONE')).send()
    } else {
      response.say(translate('PAIRING_START')).send()
    }
  });

  return false;
};

// - Do Pairing ID key lookup to get email
// - Writes USER_ID_TO_EMAILS_KEY entry with the User ID supplied by standard Alexa Lambda request.
const pairingFinalizeIntent = function(request, response) {
  let pairingId = request.slot('PAIRINGID'),
      userId = request.getSession().details.userId;

  if (_.isEmpty(pairingId)) {
    response.say(translate('ERROR_MESSAGE')).send();
    return true;
  }

  getRedisClient().get(`pairing_${pairingId}`, (err, email) => {
    if (email === null || !_.isEmpty(err)) {
      response.say(translate('PAIRING_TOO_OLD')).send();
      return;
    }

    getRedisClient().hset(USER_ID_TO_EMAILS_KEY, userId, email, () => {
      response.say(translate('PAIRING_SUCCESS')).send();
    });
  });

  return false;
};

// MP API intents

const mpApiIntentHelper = function(intentFunc) {
  return (request, response) => {
    getEmail(request).then((email) => {
      let mpApi = alexaApp.mountainProjectApiCreator(email, MP_API_KEY);
      intentFunc(mpApi, request, response);
    }, () => {
      console.log("Wasn't able to find email, sending pairing message.");
      // Wasn't able to find email, pairing required.
      response.say(translate('PAIRING_START')).send();
    });

    return false;
  };
};

const recentClimbIntent = mpApiIntentHelper((mpApi, request, response) => {
  const count = getCount(request.slot('COUNT'));
  mpApi.getRecentClimbs(count).then((routes) => {
    let climbedAts = buildRouteLocationStrings(routes);
    let result = `You recently climbed${climbedAts.join(',')}.`;
    response.say(result).send();
  }, errorResponse(response));
});

const recentTodoIntent = mpApiIntentHelper((mpApi, request, response) => {
  let count = getCount(request.slot('COUNT'));
  mpApi.getRecentTodos(count).then((routes) => {
    let todosAdded = buildRouteLocationStrings(routes);
    let result = `You added${todosAdded.join(',')} to your list of todos.`;
    response.say(result).send();
  }, errorResponse(response));
});

const hardestGradeIntent = mpApiIntentHelper((mpApi, request, response) => {
  mpApi.getTicks().then((ticksJson) => {
    if (!_.isEmpty(ticksJson['hardest'])) {
      let result = `Your hardest grade was rated ${ticksJson['hardest']}`;
      response.say(result).send();
    } else {
      response.say(translate('HAVENT_CLIMBED_YET'));
    }
  }, errorResponse(response));
});

alexaApp.intent('PairingStart', {
  utterances: [
    'start pairing',
    "I'd like to pair",
  ]
}, pairingStartIntent);

alexaApp.intent('PairingFinalize', {
  slots: {
    'PAIRINGID': 'AMAZON.NUMBER'
  },
  utterances: [
    'pair {PAIRINGID}',
    "i'd like to pair {PAIRINGID}"
  ]
}, pairingFinalizeIntent)
alexaApp.intent('PairingUndo', {
  utterances: [
    "I'd like to unpair",
    "I'd like to unpair my account",
    'unpair',
    'unpair my account {please|}',
    '{please|} unpair my account',
  ]
}, pairingUndoIntent);

alexaApp.intent('RecentClimb', {
  slots: {
    'COUNT': 'AMAZON.NUMBER',
  },
  utterances: [
    'what are my {2-5|COUNT} most recent climbs',
    'what are my {2-5|COUNT} recent climbs',
    'what are my {most|} recent climbs',
    'what did I climb {most|} recently',
    'what climbs was I on {most|} recently',
  ]
}, recentClimbIntent);

alexaApp.intent('RecentTodo', {
  slots: {
    'COUNT': 'AMAZON.NUMBER',
  },
  utterances: [
    'what are my {2-5|COUNT} most recent todos',
    'what are my {2-5|COUNT} recent todos',
    'what are my {most|} recent todos',
    'what did I todo {most|} recently',
    'what climbs did I add to my todo list {most|} recently',
  ]
}, recentTodoIntent);

alexaApp.intent('HardestGrade', {
  utterances: [
    'what was my hardest grade',
    'what is my hardest grade',
    "what is the hardest grade I've climbed",
  ]
}, hardestGradeIntent);

// Alexa App Callbacks
///////////////////////

alexaApp.pre = function(request, response, type) {
  // 1. Check the basics: Environment + Application ID match
  if (process.env.AWS_ENVIRONMENT !== 'development' &&
      request['sessionDetails']['application']['applicationId'] != APP_ID) {
    // fail ungracefully
    console.error('Error -- Request: ', request);
    response.fail('Invalid applicationId');
  }
};

alexaApp.launch(recentClimbIntent);
alexaApp.error = function(exception, request, response) {
  console.error(exception);
  response.say('Sorry, something bad happened!');
};

// Exports
///////////

alexaApp.messages.NO_INTENT_FOUND = translate('ERROR_MESSAGE');
exports.handler = alexaApp.lambda();
exports.alexaApp = alexaApp;
exports.intentTesting = function(mockMpApiCreator, mockRedisClient) {
  alexaApp.mountainProjectApiCreator = mockMpApiCreator;
  getRedisClient().end(true);
  alexaApp.redisClient = mockRedisClient;
  return {
    pairingFinalizeIntent: pairingFinalizeIntent,
    recentClimbIntent: recentClimbIntent,
    recentTodoIntent: recentTodoIntent,
    hardestGradeIntent: hardestGradeIntent
  };
};
