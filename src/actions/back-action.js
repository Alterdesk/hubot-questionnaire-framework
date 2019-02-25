const Action = require('./action.js');

class BackAction extends Action {
    constructor(checkpoint) {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, 0);
        this.checkpoint = checkpoint;
        this.controlsFlow = true;
    }

    start(response, answers, flowCallback) {
        this.flow.previous(this.checkpoint);
        flowCallback();
    }
}

module.exports = BackAction;