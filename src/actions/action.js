const Logger = require('./../logger.js');

// Class to preform an external action during a flow
class Action {
    constructor(callback, waitMs) {
        this.callback = callback;
        this.waitMs = waitMs || 0;
    }

    // Set the parent flow
    setFlow(flow) {
        this.flow = flow;
    }

    // Set the sub flow to execute after this action
    setSubFlow(subFlow) {
        this.subFlow = subFlow;
    }

    // Execute this action
    execute(flow, msg, answers) {
        // Trigger action callback
        this.callback(msg, answers, () => {
            if(this.waitMs > 0) {
                Logger.debug("Action::execute() Waiting after executing action for " + this.waitMs + " milliseconds");
            }
            setTimeout(() => {
                flow.actionDone(this);
            }, this.waitMs);
        });
    }
}

module.exports = Action;