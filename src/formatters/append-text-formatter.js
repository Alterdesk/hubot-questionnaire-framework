const Extra = require('node-messenger-extra');

const Formatter = require('./formatter.js');
const Logger = require('./../logger.js');

class AppendTextFormatter extends Formatter {

    constructor(appendText) {
        super();
        this.appendText = appendText;
        this.formatters = [];
    }

    execute(text, answers) {
        if(typeof this.appendText !== "string") {
            Logger.error("AppendTextFormatter::execute() Invalid text:", this.appendText);
            return text;
        }
        Logger.debug("AppendTextFormatter::execute() Using text: \"" + this.appendText + "\"");
        if(!this.checkConditions(answers)) {
            Logger.debug("AppendTextFormatter::execute() Condition not met");
            return text;
        }

        var result = this.appendText;
        if(this.prefixText && this.prefixText.length > 0) {
            result = this.prefixText + result;
        }
        if(this.suffixText && this.suffixText.length > 0) {
            result = result + this.suffixText;
        }
        for(let i in this.formatters) {
            var formatter = this.formatters[i];
            formatter.setEscapeHtml(this.escapeHtml);
            if(this.repeatIteration > -1) {
                formatter.setRepeatIteration(this.repeatIteration);
            }
            result = formatter.execute(result, answers);
        }
        if(this.escapeHtml) {
            result = Extra.escapeHtml(result);
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

}

module.exports = AppendTextFormatter;