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
            if(this.fallbackText != null) {
                Logger.debug("ReplaceAnswerFormatter::execute() Using fallback: \"" + this.fallbackText + "\" answerKey: \"" + this.answerKey + "\"");
                return text.replace(this.from, this.fallbackText);
            }
            Logger.debug("ReplaceAnswerFormatter::execute() Answer not found: \"" + this.answerKey + "\"");
            return text;
        }
        var answerValue = answers.get(this.answerKey);
        if(answerValue == null) {
            Logger.error("ReplaceAnswerFormatter::execute() Invalid answer: \"" + this.answerKey + "\"");
            return text;
        }
        var textForAnswer = this.textForAnswers[answerValue];
        if(textForAnswer) {
            return text.replace(this.from, textForAnswer);
        }
        return text.replace(this.from, answerValue);
    }

    addTextForAnswer(value, text) {
        this.textForAnswers[value] = text;
    }

    setFallbackText(fallbackText) {
        this.fallbackText = fallbackText;
    }

}

module.exports = ReplaceAnswerFormatter;