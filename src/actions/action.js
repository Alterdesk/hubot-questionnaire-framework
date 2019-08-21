const Logger = require('./../logger.js');
const Step = require('./../step.js');

// Class to preform an external action during a flow
class Action extends Step {
    constructor(callback, waitMs) {
        super();
        this.callback = callback;
        this.waitMs = waitMs || 0;
        this.controlsFlow = false;
        this.askedQuestions = false;
    }

    // Set the sub flow to execute after this action
    setSubFlow(subFlow) {
        this.subFlow = subFlow;
    }

    // Execute this action
    execute() {
        // Trigger action callback
        this.callback(() => {
            if(this.waitMs > 0) {
                Logger.debug("Action::execute() Waiting after executing action for " + this.waitMs + " milliseconds");
            }
            setTimeout(() => {
                this.flow.actionDone(this);
            }, this.waitMs);
        });
    }

    resetAskedQuestions() {
        this.askedQuestions = false;
    }

    reset() {
        super.reset();
        this.subFlow = null;
    }
}

module.exports = Action;