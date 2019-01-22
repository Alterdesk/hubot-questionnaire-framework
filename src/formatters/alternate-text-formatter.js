const AnswerCondition = require('./../conditions/answer-condition.js');
const Formatter = require('./formatter.js');
const Logger = require('./../logger.js');

class AlternateTextFormatter extends Formatter {

    constructor(alternateText) {
        super();
        this.alternateText = alternateText;
        this.conditions = [];
    }

    execute(text, answers) {
        Logger.debug("AlternateTextFormatter::execute() Alternate text:\"" + this.alternateText + "\"");
        for(let i in this.conditions) {
            var condition = this.conditions[i];
            if(!condition.check(answers)) {
                Logger.debug("AlternateTextFormatter::execute() Condition not met: ", condition);
                return text;
            }
        }
        return this.alternateText;
    }

    addCondition(condition) {
        this.conditions.push(condition);
    }

    addAnswerCondition(answerKey, answerValue) {
        var condition = new AnswerCondition();
        condition.addKey(answerKey);
        condition.setValue(answerKey, answerValue);
        this.addCondition(condition);
    }

}

module.exports = AlternateTextFormatter;