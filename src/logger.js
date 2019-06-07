const Extra = require('node-messenger-extra');

module.exports = new Extra.Logger(process.env.HUBOT_QUESTIONNAIRE_LOG_LEVEL || process.env.HUBOT_LOG_LEVEL || 'debug');