const Formatter = require('./formatter.js');
const ChatTools = require('./../utils/chat-tools.js');
const DateTools = require('./../utils/date-tools.js');
const Logger = require('./../logger.js');
const StringTools = require('./../utils/string-tools.js');

class ReplaceDateFormatter extends Formatter {

    constructor(from, format) {
        super();
        this.from = from;
        this.format = format;
    }

    execute(text, flow) {
        var date;
        if(!this.checkConditions(flow)) {
            Logger.debug("ReplaceDateFormatter::execute() Condition not met");
            return text;
        }
        if(!this.from || this.from.length === 0) {
            Logger.error("ReplaceDateFormatter::execute() Invalid from: \"" + this.from + "\"");
            return text;
        }
        if(!this.format || this.format.length === 0) {
            Logger.error("ReplaceDateFormatter::execute() Invalid format: \"" + this.format + "\"");
            return text;
        }
        var answerKey = ChatTools.getAnswerKey(this.answerKey, flow);
        if(answerKey && flow.answers.has(answerKey)) {
            date = flow.answers.get(answerKey);
        } else {
            date = DateTools.utcDate();
        }
        if(!date) {
            Logger.error("ReplaceDateFormatter::execute() Invalid date:", date);
            return text;
        }
        Logger.debug("ReplaceDateFormatter::execute() Using from: \"" + this.from + "\" format: \"" + this.format + "\"" + " Date: " + date);
        var formatted = DateTools.formatToLocal(date, this.format);
        if(this.prefixText && this.prefixText.length > 0) {
            formatted = this.prefixText + formatted;
        }
        if(this.suffixText && this.suffixText.length > 0) {
            formatted = formatted + this.suffixText;
        }
        if(this.escapeHtml) {
            formatted = StringTools.escapeHtml(formatted);
        }
        return text.replace(this.from, formatted);
    }

    setAnswerKey(answerKey) {
        this.answerKey = answerKey;
    }

    setPrefixText(prefixText) {
        this.prefixText = prefixText;
    }

    setSuffixText(suffixText) {
        this.suffixText = suffixText;
    }

}

module.exports = ReplaceDateFormatter;