const Action = require('./action.js');
const AnswerCondition = require('./../conditions/answer-condition.js');
const Logger = require('./../logger.js');

class FlowAction extends Action {
    constructor(flow) {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, 0);
        this.passFlow = flow;
        this.conditions = [];
    }

    start(response, answers, flowCallback) {
        for(let i in this.conditions) {
            var condition = this.conditions[i];
            if(!condition.check(answers)) {
                Logger.debug("FlowAction::start() Condition not met: ", condition);
                if(this.failFlow) {
                    this.setSubFlow(this.failFlow);
                }
                flowCallback();
                return;
            }
        }

        this.setSubFlow(this.passFlow);
        flowCallback();
    }

    setFailFlow(failFlow) {
        this.failFlow = failFlow;
    }

    addCondition(condition) {
        this.conditions.push(condition);
    }
}

module.exports = FlowAction;