const Action = require('./action.js');

class BackAction extends Action {
    constructor(checkpoint) {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
        this.checkpoint = checkpoint;
        this.controlsFlow = true;
    }

    start(flowCallback) {
        this.flow.previous(this.checkpoint);
        flowCallback();
    }
}

module.exports = BackAction;