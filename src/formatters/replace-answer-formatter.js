const Formatter = require('./formatter.js');
const Logger = require('./../logger.js');

class ReplaceAnswerFormatter extends Formatter {

    constructor(from, answerKey) {
        super();
        this.from = from;
        this.answerKey = answerKey;
    }

    execute(text, answers) {
        Logger.debug("ReplaceAnswerFormatter::execute() Using from: \"" + this.from + "\" answerKey: \"" + this.answerKey + "\"");
        if(!this.from) {
            return text;
        }
        var answerValue = answers.get(this.answerKey);
        if(answerValue == null) {
            return text;
        }
        return text.replace(this.from, answerValue);
    }

}

module.exports = ReplaceAnswerFormatter;