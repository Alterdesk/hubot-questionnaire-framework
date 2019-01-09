const Formatter = require('./formatter.js');
const Logger = require('./../logger.js');

class ReplaceAnswerFormatter extends Formatter {

    constructor(from, answerKey) {
        super();
        this.from = from;
        this.answerKey = answerKey;
        this.textForAnswers = {};
    }

    execute(text, answers) {
        Logger.debug("ReplaceAnswerFormatter::execute() Using from: \"" + this.from + "\" answerKey: \"" + this.answerKey + "\"");
        if(!this.from || !this.answerKey) {
            return text;
        }
        if(!answers.has(this.answerKey)) {
            Logger.debug("ReplaceAnswerFormatter::execute() Answer not found: \"" + this.answerKey + "\"");
            if(this.fallbackText != null) {
                Logger.debug("ReplaceAnswerFormatter::execute() Using fallback: \"" + this.fallbackText + "\" answerKey: \"" + this.answerKey + "\"");
                return text.replace(this.from, this.fallbackText);
            }
            return text;
        }
        var answerValue = answers.get(this.answerKey);
        if(answerValue == null) {
            Logger.error("ReplaceAnswerFormatter::execute() Invalid answer: \"" + this.answerKey + "\"");
            return text;
        }
        if(typeof answerValue === "object") {
            if(answerValue.length === 0) {
                Logger.debug("ReplaceAnswerFormatter::execute() Answer is empty: \"" + this.answerKey + "\"");
                if(this.fallbackText != null) {
                    Logger.debug("ReplaceAnswerFormatter::execute() Using fallback: \"" + this.fallbackText + "\" answerKey: \"" + this.answerKey + "\"");
                    return text.replace(this.from, this.fallbackText);
                }
                return text;
            }
            var result = "";
            for(let i in answerValue) {
                var textForAnswer = this.getTextForAnswer(answerValue[i]);
                if(result.length === 0) {
                    result += textForAnswer;
                } else {
                    result += ", " + textForAnswer;
                }
            }
            return text.replace(this.from, result);
        }
        var result = this.getTextForAnswer(answerValue);
        return text.replace(this.from, result);
    }

    getTextForAnswer(value) {
        var textForAnswer = this.textForAnswers[value];
        if(textForAnswer) {
            return textForAnswer;
        }
        return value;
    }

    addTextForAnswer(value, text) {
        this.textForAnswers[value] = text;
    }

    setFallbackText(fallbackText) {
        this.fallbackText = fallbackText;
    }

}

module.exports = ReplaceAnswerFormatter;