const Moment = require('moment-timezone');

const Formatter = require('./formatter.js');
const Logger = require('./../logger.js');

const USE_TIMEZONE = process.env.HUBOT_QUESTIONNAIRE_USE_TIMEZONE || process.env.USE_TIMEZONE || "UTC";

class ReplaceDateFormatter extends Formatter {

    constructor(from, format) {
        super();
        this.from = from;
        this.format = format;
    }

    execute(text, answers) {
        var date;
        if(this.answerKey && answers.has(this.answerKey)) {
            date = answers.get(this.answerKey);
        } else {
            date = new Date();
        }
        Logger.debug("ReplaceDateFormatter::execute() Using from: \"" + this.from + "\" format: \"" + this.format + "\"" + " Date: " + date);
        if(!this.from) {
            return text;
        }
        if(!this.format) {
            return text;
        }
        if(!date) {
            return text;
        }
        var formatted = Moment(date).tz(USE_TIMEZONE).format(this.format);
        return text.replace(this.from, formatted);
    }

    setAnswerKey(answerKey) {
        this.answerKey = answerKey;
    }

}

module.exports = ReplaceDateFormatter;