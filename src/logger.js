const Logger = require('node-messenger-log');

module.exports = new Logger(process.env.HUBOT_QUESTIONNAIRE_LOG_LEVEL || process.env.HUBOT_LOG_LEVEL || 'debug');