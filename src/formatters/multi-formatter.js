const AlternateTextFormatter = require('./alternate-text-formatter.js');
const Formatter = require('./formatter.js');
const Logger = require('./../logger.js');

class MultiFormatter extends Formatter {

    constructor(from, formatters) {
        super();
        this.from = from;
        this.formatters = formatters;
    }

    execute(text, answers) {
        Logger.debug("MultiFormatter::execute() Using from: \"" + this.from + "\" formatters: \"" + this.formatters + "\"");
        if(!this.checkConditions(answers)) {
            Logger.debug("MultiFormatter::execute() Condition not met");
            return text;
        }
        if(!this.from) {
            return text;
        }
        if(this.formatters.length === 0) {
            return text;
        }
        var result = "";
        for(let i in this.formatters) {
            var formatter = this.formatters[i];
            if(this.repeatIteration > -1) {
                formatter.setRepeatIteration(this.repeatIteration);
            }
            if(formatter instanceof AlternateTextFormatter) {
                result += formatter.execute("", answers);
            } else {
                result += formatter.execute("%replace%", answers);
            }
        }
        return text.replace(this.from, result);
    }

}

module.exports = MultiFormatter;