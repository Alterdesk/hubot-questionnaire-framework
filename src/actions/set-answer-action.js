const Action = require('./action.js');
const Logger = require('./../logger.js');

class SetAnswerAction extends Action {
    constructor(answerKey, answerValue) {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
        this.answerKey = answerKey;
        this.answerValue = answerValue;
    }

    start(flowCallback) {
        var answers = this.flow.answers;
        var answerKey = this.getAnswerKey();
        var value = this.getAnswerValue(this.answerValue, answers);
        if(value != null) {
            Logger.debug("SetAnswerAction::start() Setting answer: key: " + answerKey + " value: " + value);
            answers.add(answerKey, value);
        }
        flowCallback();
    }
}

module.exports = SetAnswerAction;