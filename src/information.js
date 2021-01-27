const Logger = require('./logger.js');
const Step = require('./step.js');

// Class to send the user information during a flow
class Information extends Step {
    constructor(text, waitMs) {
        super();
        this.text = text;
        this.waitMs = waitMs || 0;
        this.formatters = [];
    }

    // Execute this information message
    execute() {
        var result = this.text;

        // Format text with formatters if set
        for(let formatter of this.formatters) {
            result = formatter.execute(result, this.flow);
        }

        // Send information message text
        this.flow.msg.send(result);
        if(this.waitMs < 1) {
            this.flow.next();
            return;
        }
        Logger.debug("Information::execute() Waiting after sending information for " + this.waitMs + " milliseconds");
        setTimeout(() => {
            this.flow.next();
        }, this.waitMs);
    }

    addFormatter(formatter) {
        this.formatters.push(formatter);
    }
}

module.exports = Information;
