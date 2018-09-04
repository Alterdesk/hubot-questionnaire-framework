const Logger = require('./logger.js');

// Class to send the user information during a flow
class Information {
    constructor(text, waitMs) {
        this.text = text;
        this.waitMs = waitMs || 0;
    }

    // Execute this information message
    execute(flow, msg) {
        // Send information message text
        msg.send(this.text);
        if(this.waitMs > 0) {
            Logger.debug("Information::execute() Waiting after sending information for " + this.waitMs + " milliseconds");
        }
        setTimeout(() => {
            flow.next();
        }, this.waitMs);
    }
}

module.exports = Information;