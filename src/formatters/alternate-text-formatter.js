const Formatter = require('./formatter.js');
const Logger = require('./../logger.js');
const StringTools = require('./../utils/string-tools.js');

class AlternateTextFormatter extends Formatter {

    constructor(alternateText) {
        super();
        this.alternateText = alternateText;
    }

    execute(text, flow) {
        let alternateText = this.alternateText;
        if(!alternateText || alternateText.length === 0) {
            Logger.debug("AlternateTextFormatter::execute() Invalid alternate text: \"" + this.alternateText + "\"");
            return text;
        }
        if(!this.checkConditions(flow)) {
            Logger.debug("AlternateTextFormatter::execute() Condition not met: text: \"" + this.alternateText + "\"");
            return text;
        }
        Logger.debug("AlternateTextFormatter::execute() Alternate text: \"" + this.alternateText + "\"");
        if(this.escapeHtml) {
            return StringTools.escapeHtml(alternateText);
        }
        return alternateText;
    }

}

module.exports = AlternateTextFormatter;
