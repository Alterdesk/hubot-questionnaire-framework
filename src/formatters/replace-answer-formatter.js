const Formatter = require('./formatter.js');
const Logger = require('./../logger.js');

class ReplaceAnswerFormatter extends Formatter {

    constructor(from, answerKey) {
        super();
        this.from = from;
        this.answerKey = answerKey;
        this.textForAnswers = {};
        this.listMode = "ENUMERATE";
        this.bulletMode = "POINT";
        this.bulletStyle = " • ";
    }

    execute(text, answers) {
        Logger.debug("ReplaceAnswerFormatter::execute() Using from: \"" + this.from + "\" answerKey: \"" + this.answerKey + "\"");
        if(!this.checkConditions(answers)) {
            Logger.debug("ReplaceAnswerFormatter::execute() Condition not met");
            return text;
        }
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
            var result = this.getTextForArray(answerValue);
            if(!result || result.length === 0) {
                Logger.debug("ReplaceAnswerFormatter::execute() Answer is empty or invalid: key:\"" + this.answerKey + "\" value:", this.answerValue);
                if(this.fallbackText != null) {
                    Logger.debug("ReplaceAnswerFormatter::execute() Using fallback: \"" + this.fallbackText + "\" answerKey: \"" + this.answerKey + "\"");
                    return text.replace(this.from, this.fallbackText);
                }
                return text;
            }
            return text.replace(this.from, result);
        }
        var result = this.getTextForAnswer(answerValue);
        return text.replace(this.from, result);
    }

    getTextForArray(value) {
        if(!value || value.length === 0) {
            return null;
        }
        var result = "";
        for(let i in value) {
            var index = parseInt(i, 10);
            var text = this.getTextForAnswer(value[i]);
            if(this.listMode === "LIST") {
                var addText = text;
                if(this.bulletMode === "POINT") {
                    addText = this.bulletStyle + text;
                } else if(this.bulletMode === "NUMBER") {
                    var number = index + 1;
                    addText = number + ": " + text;
                }
                if(result.length === 0) {
                    result += addText;
                } else {
                    result += "\n" + addText;
                }
            } else if(this.listMode === "ENUMERATE") {
                if(result.length === 0) {
                    result += text;
                } else if(value.length === index + 1 && this.conjunctionWord && this.conjunctionWord.length) {
                    result += this.conjunctionWord + " " + text;
                } else {
                    result += ", " + text;
                }
            }
        }
        return result;
    }

    getTextForAnswer(value) {
        var text = this.textForAnswers[value];
        if(text) {
            return text;
        }
        return value;
    }

    addTextForAnswer(value, text) {
        this.textForAnswers[value] = text;
    }

    setFallbackText(fallbackText) {
        this.fallbackText = fallbackText;
    }

    setListMode(listMode) {
        this.listMode = listMode;
    }

    setBulletMode(bulletMode) {
        this.bulletMode = bulletMode;
    }

    setBulletStyle(bulletStyle) {
        this.bulletStyle = bulletStyle;
    }

    setConjunctionWord(conjunctionWord) {
        this.conjunctionWord = conjunctionWord;
    }

}

module.exports = ReplaceAnswerFormatter;