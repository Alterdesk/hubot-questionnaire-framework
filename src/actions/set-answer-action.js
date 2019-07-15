const Action = require('./action.js');
const AnswerOrFixed = require('./../utils/answer-or-fixed.js');
const Logger = require('./../logger.js');

class SetAnswerAction extends Action {
    constructor(answerKey, answerValue) {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, 0);
        this.answerKey = answerKey;
        this.answerValue = answerValue;
    }

    start(response, answers, flowCallback) {
        var value = AnswerOrFixed.get(this.answerValue, answers);
        if(value != null) {
            Logger.debug("SetAnswerAction::start() Setting answer: key: " + this.answerKey + " value: " + value);
            answers.add(this.answerKey, value);
        }
        flowCallback();
    }
}

module.exports = SetAnswerAction;