const Action = require('./action.js');

class SummaryAction extends Action {
    constructor(summaryFunction, waitMs) {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, waitMs || 0);
        this.summaryFunction = summaryFunction;
    }

    start(response, answers, flowCallback) {
        var summary = this.summaryFunction(answers);
        if(summary && summary !== "") {
            response.send(summary);
        }
        flowCallback();
    }
}

module.exports = SummaryAction;