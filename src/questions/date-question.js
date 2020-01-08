const DateTools = require('./../utils/date-tools.js');
const Question = require('./question.js');

// Date Question, accepts a date by a given format and is parsed to Date
class DateQuestion extends Question {
    constructor(answerKey, questionText, invalidText, regex, dateFormat) {
        super(answerKey, questionText, invalidText);
        this.regex = regex;
        this.dateFormat = dateFormat;
    }

    // Check if valid text and if length is accepted
    checkAndParseAnswer(matches, message) {
        if(message.text instanceof Date) {
            return message.text;
        }
        if(matches == null || matches.length === 0) {
            return null;
        }
        var matchString = matches[0];
        if(!matchString || matchString.length === 0) {
            return null;
        }
        var moment = DateTools.parseLocalToUTC(matchString, this.dateFormat);
        if(!moment) {
            return null;
        }
        return moment.toDate();
    }

}

module.exports = DateQuestion;