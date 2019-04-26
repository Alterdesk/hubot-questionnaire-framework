const Extra = require('node-messenger-extra');

const AnswerCondition = require('./../conditions/answer-condition.js');
const Formatter = require('./formatter.js');
const Logger = require('./../logger.js');

class AlternateTextFormatter extends Formatter {

    constructor(alternateText) {
        super();
        this.alternateText = alternateText;
    }

    execute(text, answers) {
        Logger.debug("AlternateTextFormatter::execute() Alternate text:\"" + this.alternateText + "\"");
        if(!this.checkConditions(answers)) {
            Logger.debug("AlternateTextFormatter::execute() Condition not met");
            return text;
        }
        if(this.escapeHtml) {
            return Extra.escapeHtml(this.alternateText);
        }
        return this.alternateText;
    }

}

module.exports = AlternateTextFormatter;