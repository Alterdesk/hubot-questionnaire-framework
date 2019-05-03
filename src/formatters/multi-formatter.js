const Formatter = require('./formatter.js');
const Logger = require('./../logger.js');

class MultiFormatter extends Formatter {

    constructor(from, formatters) {
        super();
        this.from = from;
        this.formatters = formatters;
    }

    execute(text, answers) {
        if(!this.formatters || this.formatters.length === 0) {
            Logger.error("MultiFormatter::execute() Invalid formatters:", this.formatters);
            return text;
        }
        if(this.from && !text.match(this.from)) {
            Logger.debug("MultiFormatter::execute() No from regex match:", this.from, text);
            return text;
        }
        if(!this.checkConditions(answers)) {
            Logger.debug("MultiFormatter::execute() Condition not met");
            return text;
        }
        var result = "";
        for(let i in this.formatters) {
            var formatter = this.formatters[i];
            formatter.setEscapeHtml(this.escapeHtml);
            if(this.repeatIteration > -1) {
                formatter.setRepeatIteration(this.repeatIteration);
            }
            result = formatter.execute(result, answers);
        }
        return text.replace(this.from, result);
    }

}

module.exports = MultiFormatter;