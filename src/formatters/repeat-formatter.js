const Formatter = require('./formatter.js');
const ChatTools = require('./../utils/chat-tools.js');
const Logger = require('./../logger.js');
const StringTools = require('./../utils/string-tools.js');

class RepeatFormatter extends Formatter {

    constructor(from, to, repeatKey) {
        super();
        this.from = from;
        this.to = to;
        this.repeatKey = repeatKey;
        this.formatters = [];
        this.startFormatters = [];
        this.dividerFormatters = [];
        this.endFormatters = [];
        this.iteration = -1;
    }

    execute(text, flow) {
        Logger.debug("RepeatFormatter::execute()");
        this.flow = flow;

        if(!this.to || this.to.length === 0) {
            Logger.debug("RepeatFormatter::execute() No to was set:", this.to);
            return text;
        }
        if(!this.from) {
            Logger.error("RepeatFormatter::execute() No from was set:", this.from);
            return text;
        }
        
        this.repeatCount = this.getRepeatCount(flow);
        Logger.debug("RepeatFormatter::execute() Repeat count:", this.repeatCount);

        var result = "";

        if(this.startText && this.startText.length > 0) {
            result = result + this.startText;
            for(let formatter of this.startFormatters) {
                formatter.setEscapeHtml(this.escapeHtml);
                result = formatter.execute(result, this.flow);
            }
        }

        for(let iteration = 0; iteration < this.repeatCount; iteration++) {
            result = this.nextIteration(iteration, result);
        }

        if(this.endText && this.endText.length > 0) {
            result = result + this.endText;
            for(let formatter of this.endFormatters) {
                formatter.setEscapeHtml(this.escapeHtml);
                result = formatter.execute(result, this.flow);
            }
        }

        if(this.escapeHtml) {
            result = StringTools.escapeHtml(result);
        }

        return text.replace(this.from, result);
    }

    getRepeatCount(flow) {
        Logger.debug("RepeatFormatter::getRepeatCount()");
        if(!this.repeatKey || this.repeatKey === "") {
            Logger.error("RepeatFormatter::getRepeatCount() Repeat answer key not set:", this.repeatKey);
            return 0;
        }
        var count = 0;
        while(true) {
            var key = ChatTools.getAnswerKey(this.repeatKey, flow, count);
            var value = flow.answers.get(key);
            if(value == null) {
                Logger.debug("RepeatFormatter::getRepeatCount() Repeat answer not given:", key, value);
                break;
            }
            if(this.repeatValue !== value && this.repeatValue != null) {
                Logger.debug("RepeatFormatter::getRepeatCount() Repeat answer does not match:", key, value, this.repeatValue);
                count++;
                break;
            }
            Logger.debug("RepeatFormatter::getRepeatCount() Repeat answer accepted:", key, value);
            count++;
        }

        return count;
    }

    nextIteration(iteration, result) {
        Logger.debug("RepeatFormatter::nextIteration() Iteration:", iteration);

        if(this.iteration > 0 && this.dividerText && this.dividerText.length > 0) {
            result = result + this.dividerText;
            for(let formatter of this.dividerFormatters) {
                formatter.setEscapeHtml(this.escapeHtml);
                formatter.setForceRepeatIteration(iteration);
                result = formatter.execute(result, this.flow);
            }
        }

        result = result + this.to;
        for(let formatter of this.formatters) {
            formatter.setEscapeHtml(this.escapeHtml);
            formatter.setForceRepeatIteration(iteration);
            result = formatter.execute(result, this.flow);
        }
        return result;
    }

    setRepeatValue(repeatValue) {
        this.repeatValue = repeatValue;
    }

    setStartText(startText) {
        this.startText = startText;
    }

    setDividerText(dividerText) {
        this.dividerText = dividerText;
    }

    setEndText(endText) {
        this.endText = endText;
    }

    addFormatter(formatter) {
        this.formatters.push(formatter);
    }

    addStartFormatter(formatter) {
        this.startFormatters.push(formatter);
    }

    addDividerFormatter(formatter) {
        this.dividerFormatters.push(formatter);
    }

    addEndFormatter(formatter) {
        this.endFormatters.push(formatter);
    }

}

module.exports = RepeatFormatter;
