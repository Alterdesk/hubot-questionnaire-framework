const Action = require('./action.js');

class RemoveAnswerAction extends Action {
    constructor(answerKey) {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, 0);
        this.answerKey = answerKey;
    }

    start(response, answers, flowCallback) {
        answers.remove(this.answerKey);
        flowCallback();
    }
}

module.exports = RemoveAnswerAction;