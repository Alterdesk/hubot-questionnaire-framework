const Formatter = require('./formatter.js');
const DateTools = require('./../utils/date-tools.js');
const Logger = require('./../logger.js');

class ReplaceDateFormatter extends Formatter {

    constructor(from, format) {
        super();
        this.from = from;
        this.format = format;
    }

    execute(text, answers) {
        var date;
        if(!this.checkConditions(answers)) {
            Logger.debug("ReplaceDateFormatter::execute() Condition not met");
            return text;
        }
        var answerKey = this.answerKey;
        if(answerKey && this.repeatIteration > -1) {
            answerKey = answerKey + "_" + this.repeatIteration;
        }
        if(answerKey && answers.has(answerKey)) {
            date = answers.get(answerKey);
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
        var formatted = DateTools.format(date, this.format);
        if(this.prefixText && this.prefixText.length > 0) {
            formatted = this.prefixText + formatted;
        }
        if(this.suffixText && this.suffixText.length > 0) {
            formatted = formatted + this.suffixText;
        }
        return text.replace(this.from, formatted);
    }

    setAnswerKey(answerKey) {
        this.answerKey = answerKey;
    }

    setPrefixText(prefixText) {
        this.prefixText = prefixText;
    }

    setSuffixText(suffixText) {
        this.suffixText = suffixText;
    }

}

module.exports = ReplaceDateFormatter;