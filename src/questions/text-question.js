const Extra = require('node-messenger-extra');

const Question = require('./question.js');

// Text Question, accepts non empty text
class TextQuestion extends Question {
    constructor(answerKey, questionText, invalidText) {
        super(answerKey, questionText, invalidText);
        this.regex = Extra.getTextRegex();
    }

    // Use an alternative regular expression
    setRegex(regex) {
        this.regex = regex;
    }

    // Set the accepted length of the answer
    setLength(min, max) {
        this.min = min;
        this.max = max;
    }

    // Check if valid text and if length is accepted
    checkAndParseAnswer(matches, message) {
        if(matches == null) {
            return null;
        }
        if(this.acceptedLength(message.text)) {
            return message.text;
        }
        return null;
    }

    // Check the text length
    acceptedLength(text) {
        if(this.min != null && this.max != null) {
            return text.length >= this.min && text.length <= this.max;
        } else if(this.min != null) {
            return text.length >= this.min;
        } else if(this.max != null) {
            return text.length <= this.max;
        }
        return true;
    }
}

module.exports = TextQuestion;