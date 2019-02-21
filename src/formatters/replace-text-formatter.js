const Formatter = require('./formatter.js');
const Logger = require('./../logger.js');

class ReplaceTextFormatter extends Formatter {

    constructor(from, to) {
        super();
        this.from = from;
        this.to = to;
    }

    execute(text, answers) {
        Logger.debug("ReplaceTextFormatter::execute() Using from: \"" + this.from + "\" to: \"" + this.to + "\"");
        if(!this.checkConditions(answers)) {
            Logger.debug("ReplaceTextFormatter::execute() Condition not met");
            return text;
        }
        if(!this.from) {
            return text;
        }
        if(typeof this.to !== "string") {
            return text;
        }
        return text.replace(this.from, this.to);
    }

}

module.exports = ReplaceTextFormatter;