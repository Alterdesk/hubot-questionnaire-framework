const Extra = require('node-messenger-extra');

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
            Logger.error("ReplaceTextFormatter::execute() No from was set:", this.from);
            return text;
        }
        if(typeof this.to !== "string") {
            return text;
        }

        var to = this.to;
        if(this.prefixText && this.prefixText.length > 0) {
            to = this.prefixText + to;
        }
        if(this.suffixText && this.suffixText.length > 0) {
            to = to + this.suffixText;
        }
        if(this.escapeHtml) {
            to = Extra.escapeHtml(to);
        }
        return text.replace(this.from, to);
    }

    setPrefixText(prefixText) {
        this.prefixText = prefixText;
    }

    setSuffixText(suffixText) {
        this.suffixText = suffixText;
    }

}

module.exports = ReplaceTextFormatter;