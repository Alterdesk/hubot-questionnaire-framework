const Action = require('./action.js');
const AnswerCondition = require('./../answer_condition.js');
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
        var condition = new AnswerCondition(answerKey);
        condition.setValue(answerValue);
        this.conditions.push(condition);
    }
}

module.exports = FlowAction;