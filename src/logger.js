const Log = require('log');

// Set the log instance
const Logger = new Log(process.env.HUBOT_QUESTIONNAIRE_LOG_LEVEL || process.env.HUBOT_LOG_LEVEL || 'info');

module.exports = Logger;