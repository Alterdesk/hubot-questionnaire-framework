const Question = require('./question.js');
const RegexTools = require('./../utils/regex-tools.js');

// Number Question, accepts numbers, can limit to accepted range
class NumberQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = RegexTools.getNumberRegex();
    }

    // Limit the valid answer to range
    setRange(min, max) {
        this.min = min;
        this.max = max;
    }

    // Parse given number as float and only accept if in range
    checkAndParseAnswer(matches, message) {
        if(matches == null && typeof message.text !== "number") {
            return null;
        }
        var value;
        if(matches) {
            value = parseFloat(matches[0]);
        } else {
            value = parseFloat(message.text);
        }
        if(typeof value !== "number") {
            return null;
        }
        if(this.inRange(value)) {
            return value;
        }
        return null;
    }

    // Check if the value is in range
    inRange(value) {
        if(this.min != null && this.max != null) {
            return value >= this.min && value <= this.max;
        } else if(this.min != null) {
            return value >= this.min;
        } else if(this.max != null) {
            return value <= this.max;
        }
        return true;
    }
}

module.exports = NumberQuestion;