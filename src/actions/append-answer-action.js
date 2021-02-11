const Action = require('./action.js');
const Logger = require('./../logger.js');

class AppendAnswerAction extends Action {
    constructor(answerKey, answerValue) {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
        this.answerKey = answerKey;
        this.answerValue = answerValue;
    }

    start(flowCallback) {
        let answers = this.flow.answers;
        let value = this.getAnswerValue(this.answerValue, answers);
        if(value != null) {
            Logger.debug("AppendAnswerAction::start() Appending answer: key: " + this.answerKey + " value: " + value);
            let list = answers.get(this.answerKey);
            if(!(list instanceof Object)) {
                let previousValue = list;
                list = [];
                if(previousValue != null) {
                    list.push(previousValue);
                }
            }
            list.push(value);
            answers.add(this.answerKey, list);
        }
        flowCallback();
    }
}

module.exports = AppendAnswerAction;
