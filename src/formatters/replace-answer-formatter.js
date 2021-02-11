const Formatter = require('./formatter.js');
const Logger = require('./../logger.js');
const StringTools = require('./../utils/string-tools.js');

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

    execute(text, flow) {
        let answerKey = this.getAnswerKey(flow);
        if(!answerKey) {
            Logger.error("ReplaceAnswerFormatter::execute() Invalid answerKey: \"" + answerKey + "\"");
            return text;
        }
        if(!this.from) {
            Logger.error("ReplaceAnswerFormatter::execute() Invalid from: \"" + this.from + "\"");
            return text;
        }
        if(!this.checkConditions(flow)) {
            Logger.debug("ReplaceAnswerFormatter::execute() Condition not met: from: \"" + this.from + "\" answerKey: \"" + answerKey + "\"");
            return text;
        }
        Logger.debug("ReplaceAnswerFormatter::execute() Using from: \"" + this.from + "\" answerKey: \"" + answerKey + "\"");
        if(!flow.answers.has(answerKey)) {
            Logger.debug("ReplaceAnswerFormatter::execute() Answer not found: \"" + answerKey + "\"");
            if(this.fallbackText != null) {
                Logger.debug("ReplaceAnswerFormatter::execute() Using fallback: \"" + this.fallbackText + "\" answerKey: \"" + answerKey + "\"");
                let fallback = this.fallbackText;
                if(this.escapeHtml) {
                    fallback = StringTools.escapeHtml(fallback);
                }
                return text.replace(this.from, fallback);
            }
            return text;
        }
        let answerValue = flow.answers.get(answerKey);
        if(answerValue == null) {
            Logger.error("ReplaceAnswerFormatter::execute() Invalid answer: \"" + answerKey + "\"");
            return text;
        }
        if(typeof answerValue === "object") {
            let result = this.getTextForArray(answerValue);
            if(!result || result.length === 0) {
                Logger.debug("ReplaceAnswerFormatter::execute() Answer is empty or invalid: key:\"" + answerKey + "\" value:", answerValue);
                if(this.fallbackText != null) {
                    Logger.debug("ReplaceAnswerFormatter::execute() Using fallback: \"" + this.fallbackText + "\" answerKey: \"" + answerKey + "\"");
                    let fallback = this.fallbackText;
                    if(this.escapeHtml) {
                        fallback = StringTools.escapeHtml(fallback);
                    }
                    return text.replace(this.from, fallback);
                }
                return text;
            }
            if(this.escapeHtml) {
                result = StringTools.escapeHtml(result);
            }
            return text.replace(this.from, result);
        }
        let result = this.getTextForAnswer(answerValue);
        if(this.prefixText && this.prefixText.length > 0) {
            result = this.prefixText + result;
        }
        if(this.suffixText && this.suffixText.length > 0) {
            result = result + this.suffixText;
        }
        if(this.escapeHtml) {
            result = StringTools.escapeHtml(result);
        }
        return text.replace(this.from, result);
    }

    getTextForArray(value) {
        if(!value || value.length === 0) {
            return null;
        }
        let result = "";
        for(let i in value) {
            let index = parseInt(i, 10);
            let text = this.getTextForAnswer(value[i]);
            if(this.listMode === "LIST") {
                let addText = text;
                if(this.bulletMode === "POINT") {
                    addText = this.bulletStyle + text;
                } else if(this.bulletMode === "NUMBER") {
                    let number = index + 1;
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
                    result += " " + this.conjunctionWord + " " + text;
                } else {
                    result += ", " + text;
                }
            }
        }
        return result;
    }

    getTextForAnswer(value) {
        let text = this.textForAnswers[value];
        if(text) {
            return text;
        }
        return value;
    }

    addTextForAnswer(value, text) {
        this.textForAnswers[value] = text;
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
