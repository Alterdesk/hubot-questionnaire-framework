const Formatter = require('./formatter.js');
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

    execute(text, answers, flow) {
        Logger.debug("RepeatFormatter::execute()");
        this.answers = answers;
        this.flow = flow;

        if(!this.to || this.to.length === 0) {
            Logger.debug("RepeatFormatter::execute() No to was set:", this.to);
            return text;
        }
        if(!this.from) {
            Logger.error("RepeatFormatter::execute() No from was set:", this.from);
            return text;
        }
        
        this.repeatCount = this.getRepeatCount();
        Logger.debug("RepeatFormatter::execute() Repeat count:", this.repeatCount);

        var result = "";

        if(this.startText && this.startText.length > 0) {
            result = result + this.startText;
            for(let i in this.startFormatters) {
                var formatter = this.startFormatters[i];
                formatter.setEscapeHtml(this.escapeHtml);
                result = formatter.execute(result, this.answers, this.flow);
            }
        }

        for(let iteration = 0; iteration < this.repeatCount; iteration++) {
            result = this.nextIteration(iteration, result);
        }

        if(this.endText && this.endText.length > 0) {
            result = result + this.endText;
            for(let i in this.endFormatters) {
                var formatter = this.endFormatters[i];
                formatter.setEscapeHtml(this.escapeHtml);
                result = formatter.execute(result, this.answers, this.flow);
            }
        }

        if(this.escapeHtml) {
            result = StringTools.escapeHtml(result);
        }

        return text.replace(this.from, result);
    }

    getRepeatCount() {
        Logger.debug("RepeatFormatter::getRepeatCount()");
        if(!this.repeatKey || this.repeatKey === "") {
            Logger.error("RepeatFormatter::getRepeatCount() Repeat answer key not set:", this.repeatKey);
            return 0;
        }
        var count = 0;
        while(true) {
            var key = this.repeatKey + "_" + count;
            var value = this.answers.get(key);
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
            for(let i in this.dividerFormatters) {
                var formatter = this.dividerFormatters[i];
                formatter.setEscapeHtml(this.escapeHtml);
                formatter.setRepeatIteration(iteration);
                result = formatter.execute(result, this.answers, this.flow);
            }
        }

        result = result + this.to;
        for(let i in this.formatters) {
            var formatter = this.formatters[i];
            formatter.setEscapeHtml(this.escapeHtml);
            formatter.setRepeatIteration(iteration);
            result = formatter.execute(result, this.answers, this.flow);
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