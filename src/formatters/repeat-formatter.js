const Formatter = require('./formatter.js');
const Logger = require('./../logger.js');

class RepeatFormatter extends Formatter {

    constructor(from, repeatText, repeatKey) {
        super();
        this.from = from;
        this.repeatText = repeatText;
        this.repeatKey = repeatKey;
        this.textFormatters = [];
        this.startFormatters = [];
        this.dividerFormatters = [];
        this.endFormatters = [];
        this.iteration = -1;
    }

    execute(text, answers) {
        Logger.debug("RepeatFormatter::execute()");
        this.answers = answers;

        if(!this.repeatText || this.repeatText.length === 0) {
            Logger.debug("RepeatFormatter::execute() No repeat text was set:", this.repeatText);
            return text;
        }
        if(!this.from) {
            Logger.error("RepeatFormatter::execute() No from was set:", this.from);
            return text;
        }

        var result = "";

        if(this.startText && this.startText.length > 0) {
            result = result + this.startText;
            for(let i in this.startFormatters) {
                var formatter = this.startFormatters[i];
                result = formatter.execute(result, this.answers);
            }
        }

        while(this.checkRepeat()) {
            result = this.nextIteration(result);
        }

        if(this.endText && this.endText.length > 0) {
            result = result + this.endText;
            for(let i in this.endFormatters) {
                var formatter = this.endFormatters[i];
                result = formatter.execute(result, this.answers);
            }
        }

        return text.replace(this.from, result);
    }

    checkRepeat() {
        Logger.debug("RepeatFormatter::checkRepeat() Iteration:", this.iteration);

        if(!this.checkConditions(this.answers)) {
            Logger.debug("RepeatFormatter::execute() Condition not met");
            return false;
        }

        if(this.iteration > -1 && this.repeatKey && this.repeatKey !== "") {
            var key = this.repeatKey + "_" + this.iteration;
            var value = this.answers.get(key);
            if(value == null) {
                Logger.debug("RepeatFormatter::checkRepeat() Repeat answer not given:", key, value);
                return false;
            }
            if(this.repeatValue !== value && this.repeatValue != null) {
                Logger.debug("RepeatFormatter::checkRepeat() Repeat answer does not match:", key, value, this.repeatValue);
                return false;
            }
            Logger.debug("RepeatFormatter::checkRepeat() Repeat answer accepted:", key, value);
        }

        return true;
    }

    nextIteration(result) {
        this.iteration++;
        Logger.debug("RepeatFormatter::nextIteration() Iteration:", this.iteration);

        if(this.iteration > 0 && this.dividerText && this.dividerText.length > 0) {
            result = result + this.dividerText;
            for(let i in this.dividerFormatters) {
                var formatter = this.dividerFormatters[i];
                result = formatter.execute(result, this.answers);
            }
        }

        result = result + this.repeatText;
        for(let i in this.textFormatters) {
            var formatter = this.textFormatters[i];
            if(formatter.answerKey) {
                if(!formatter.originalAnswerKey) {
                    formatter.originalAnswerKey = formatter.answerKey;
                }
                formatter.answerKey = formatter.originalAnswerKey + "_" + this.iteration;
            }
            result = formatter.execute(result, this.answers);
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

    addTextFormatter(formatter) {
        this.textFormatters.push(formatter);
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