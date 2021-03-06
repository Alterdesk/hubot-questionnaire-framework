const Formatter = require('./formatter.js');
const Logger = require('./../logger.js');
const StringTools = require('./../utils/string-tools.js');

class AppendTextFormatter extends Formatter {

    constructor(appendText) {
        super();
        this.appendText = appendText;
        this.formatters = [];
    }

    execute(text, flow) {
        if(typeof this.appendText !== "string") {
            Logger.error("AppendTextFormatter::execute() Invalid text:", this.appendText);
            return text;
        }
        if(!this.checkConditions(flow)) {
            Logger.debug("AppendTextFormatter::execute() Condition not met: text: \"" + this.appendText + "\"");
            return text;
        }
        Logger.debug("AppendTextFormatter::execute() Using text: \"" + this.appendText + "\"");

        let result = this.appendText;
        if(this.prefixText && this.prefixText.length > 0) {
            result = this.prefixText + result;
        }
        if(this.suffixText && this.suffixText.length > 0) {
            result = result + this.suffixText;
        }
        for(let formatter of this.formatters) {
            formatter.setEscapeHtml(this.escapeHtml);
            result = formatter.execute(result, flow);
        }
        if(this.escapeHtml) {
            result = StringTools.escapeHtml(result);
        }
        return text + result;
    }

    setPrefixText(prefixText) {
        this.prefixText = prefixText;
    }

    setSuffixText(suffixText) {
        this.suffixText = suffixText;
    }

    addFormatter(formatter) {
        this.formatters.push(formatter);
    }

    addFormatters(formatters) {
        this.formatters = this.formatters.concat(formatters);
    }

}

module.exports = AppendTextFormatter;
