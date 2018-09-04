const Action = require('./action.js');

class SetAnswerAction extends Action {
    constructor(answerKey, answerValue) {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, 0);
        this.answerKey = answerKey;
        this.answerValue = answerValue;
    }

    start(response, answers, flowCallback) {
        answers.add(this.answerKey, this.answerValue);
        flowCallback();
    }
}

module.exports = SetAnswerAction;