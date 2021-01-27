const Formatter = require('./formatter.js');
const Logger = require('./../logger.js');

class MultiFormatter extends Formatter {

    constructor(from, formatters) {
        super();
        this.from = from;
        this.formatters = formatters;
    }

    execute(text, flow) {
        if(!this.formatters || this.formatters.length === 0) {
            Logger.error("MultiFormatter::execute() Invalid formatters:", this.formatters);
            return text;
        }
        if(this.from && !text.match(this.from)) {
            Logger.debug("MultiFormatter::execute() No from regex match:", this.from, text);
            return text;
        }
        if(!this.checkConditions(flow)) {
            Logger.debug("MultiFormatter::execute() Condition not met");
            return text;
        }
        Logger.debug("MultiFormatter::execute() Executing " + this.formatters.length + " formatters");
        var result = "";
        for(let formatter of this.formatters) {
            formatter.setEscapeHtml(this.escapeHtml);
            result = formatter.execute(result, flow);
        }
        return text.replace(this.from, result);
    }

}

module.exports = MultiFormatter;
