const Action = require('./action.js');

class SummaryAction extends Action {
    constructor(summaryFunction, waitMs) {
        super((flowCallback) => {
            this.start(flowCallback);
        }, waitMs || 0);
        this.summaryFunction = summaryFunction;
    }

    start(flowCallback) {
        let summary = this.summaryFunction(this.flow.answers);
        if(summary && summary !== "") {
            this.flow.msg.send(summary);
        }
        flowCallback();
    }
}

module.exports = SummaryAction;
