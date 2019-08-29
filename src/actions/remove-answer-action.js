const Action = require('./action.js');

class RemoveAnswerAction extends Action {
    constructor(answerKey) {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
        this.answerKey = answerKey;
    }

    start(flowCallback) {
        var answerKey = this.getAnswerKey();
        this.flow.answers.remove(answerKey);
        flowCallback();
    }
}

module.exports = RemoveAnswerAction;