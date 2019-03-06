const Action = require('./action.js');
const AnswerOrFixed = require('./../utils/answer-or-fixed.js');

class AppendAnswerAction extends Action {
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
            var list = answers.get(this.answerKey);
            if(list == null) {
                list = [];
            } else if(!(list instanceof Object)) {
                var previousValue = list;
                list = [];
                list.push(previousValue);
            }
            list.push(value);
            answers.add(this.answerKey, list);
        }
        flowCallback();
    }
}

module.exports = AppendAnswerAction;