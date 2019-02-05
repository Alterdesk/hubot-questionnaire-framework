const Logger = require('./logger.js');

// Class to send the user information during a flow
class Information {
    constructor(text, waitMs) {
        this.text = text;
        this.waitMs = waitMs || 0;
        this.formatters = [];
    }

    // Execute this information message
    execute(flow, msg, answers) {
        var result = this.text;

        // Format text with formatters if set
        for(let i in this.formatters) {
            var formatter = this.formatters[i];
            result = formatter.execute(result, answers);
        }

        // Send information message text
        msg.send(result);
        if(this.waitMs > 0) {
            Logger.debug("Information::execute() Waiting after sending information for " + this.waitMs + " milliseconds");
        }
        setTimeout(() => {
            flow.next();
        }, this.waitMs);
    }

    addFormatter(formatter) {
        this.formatters.push(formatter);
    }
}

module.exports = Information;