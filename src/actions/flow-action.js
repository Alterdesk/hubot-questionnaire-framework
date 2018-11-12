const Action = require('./action.js');
const Logger = require('./../logger.js');

class FlowAction extends Action {
    constructor(flow) {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, 0);
        this.startFlow = flow;
        this.conditions = [];
    }

    start(response, answers, flowCallback) {
        for(let i in this.conditions) {
            var condition = this.conditions[i];
            if(!condition.check(answers)) {
                Logger.debug("FlowAction::start() Condition not met: ", condition);
                flowCallback();
                return;
            }
        }

        this.setSubFlow(this.startFlow);
        flowCallback();
    }

    addAnswerCondition(answerKey, answerValue) {
        this.conditions.push(new AnswerCondition(answerKey, answerValue));
    }
}

class AnswerCondition {
    constructor(answerKey, answerValue) {
        this.answerKey = answerKey;
        this.answerValue = answerValue;
    }

    check(answers) {
        var value = answers.get(this.answerKey);
        return value === this.answerValue;
    }
}

module.exports = FlowAction;