const AnswerValue = require('./../utils/answer-value.js');
const ChatTools = require('./../utils/chat-tools.js');
const Logger = require('./../logger.js');

class Formatter {

    constructor() {
        this.conditions = [];
        this.escapeHtml = false;
    }

    execute(text, flow) {

    }

    checkConditions(flow) {
        for(let condition of this.conditions) {
            if(this.forceRepeatIteration > -1) {
                condition.setForceRepeatIteration(this.forceRepeatIteration);
            }
            if(!condition.check(flow)) {
                Logger.debug("Formatter::checkConditions() Condition not met: ", condition);
                return false;
            }
        }
        return true;
    }

    getAnswerKey(flow) {
        return ChatTools.getAnswerKey(this.answerKey, flow, this.forceRepeatIteration);
    }

    getAnswerValue(data, answers, defaultValue, flow) {
        return AnswerValue.get(data, answers, defaultValue, flow, this.forceRepeatIteration);
    }

    addCondition(condition) {
        this.conditions.push(condition);
    }

    addConditions(conditions) {
        this.conditions = this.conditions.concat(conditions);
    }

    setForceRepeatIteration(forceRepeatIteration) {
        Logger.debug("Formatter::setForceRepeatIteration():", forceRepeatIteration);
        this.forceRepeatIteration = forceRepeatIteration;
    }

    setEscapeHtml(escapeHtml) {
        this.escapeHtml = escapeHtml;
    }

}

module.exports = Formatter;
