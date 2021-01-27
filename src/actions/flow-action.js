const Action = require('./action.js');
const Logger = require('./../logger.js');

class FlowAction extends Action {
    constructor(flow) {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
        this.passFlow = flow;
        this.conditions = [];
    }

    start(flowCallback) {
        for(let condition of this.conditions) {
            if(!condition.check(this.flow)) {
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
