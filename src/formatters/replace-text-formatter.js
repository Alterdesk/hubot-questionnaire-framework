const Formatter = require('./formatter.js');
const Logger = require('./../logger.js');
const StringTools = require('./../utils/string-tools.js');

class ReplaceTextFormatter extends Formatter {

    constructor(from, to) {
        super();
        this.from = from;
        this.to = to;
    }

    execute(text, flow) {
        if(!this.checkConditions(flow)) {
            Logger.debug("ReplaceTextFormatter::execute() Condition not met: from: \"" + this.from + "\" to: \"" + this.to + "\"");
            return text;
        }
        if(!this.from) {
            Logger.error("ReplaceTextFormatter::execute() Invalid from:", this.from);
            return text;
        }
        if(typeof this.to !== "string") {
            Logger.error("ReplaceTextFormatter::execute() Invalid to:", this.to);
            return text;
        }
        Logger.debug("ReplaceTextFormatter::execute() Using from: \"" + this.from + "\" to: \"" + this.to + "\"");

        var to = this.to;
        if(this.prefixText && this.prefixText.length > 0) {
            to = this.prefixText + to;
        }
        if(this.suffixText && this.suffixText.length > 0) {
            to = to + this.suffixText;
        }
        if(this.escapeHtml) {
            to = StringTools.escapeHtml(to);
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