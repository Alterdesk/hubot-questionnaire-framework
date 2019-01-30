const Logger = require('./../logger.js');

class AnswerCondition {
    constructor() {
        this.answerKeys = [];
        this.answerValues = {};
        this.answerRegex = {};
    }

    addKey(answerKey) {
        if(this.answerKeys.indexOf(answerKey) === -1) {
            this.answerKeys.push(answerKey);
        }
    }

    addValue(answerKey, answerValue) {
        this.addKey(answerKey);
        var values = this.answerValues[answerKey];
        if(!values) {
            values = [];
            this.answerValues[answerKey] = values;
        }
        if(values.indexOf(answerValue) === -1) {
            values.push(answerValue);
        }
    }

    setRegex(answerKey, answerRegex) {
        this.addKey(answerKey);
        this.answerRegex[answerKey] = answerRegex;
    }

    check(answers) {
        for(let i in this.answerKeys) {
            var answerKey = this.answerKeys[i];
            if(!answers.has(answerKey)) {
                Logger.debug("AnswerCondition::check() Key not available: " + answerKey);
                continue;
            }
            var answerValue = answers.get(answerKey);
            if(typeof answerValue === "object") {
                if(answerValue.length === 0) {
                    if(this.checkAnswer(answerKey, null)) {
                        return true;
                    }
                }
                for(let i in answerValue) {
                    if(this.checkAnswer(answerKey, answerValue[i])) {
                        return true;
                    }
                }
            } else {
                if(this.checkAnswer(answerKey, answerValue)) {
                    return true;
                }
            }
        }
        Logger.debug("AnswerCondition::check() Condition not met:", this);
        return false;
    }

    checkAnswer(answerKey, answerValue) {
        var regex = this.answerRegex[answerKey];
        var values = this.answerValues[answerKey];
        if((!values || values.length === 0) && !regex) {
            Logger.debug("AnswerCondition::checkAnswer() Condition met key: " + answerKey);
            return true;
        }
        if(regex && answerValue.match && answerValue.match(regex)) {
            Logger.debug("AnswerCondition::checkAnswer() Condition met key: " + answerKey + " value: " + answerValue + " regex: " + regex);
            return true;
        }
        if(!values || values.length === 0) {
            return false;
        }
        for(let i in values) {
            var checkValue = values[i];
            if(answerValue === checkValue) {
                Logger.debug("AnswerCondition::checkAnswer() Condition met key: " + answerKey + " value: " + answerValue);
                return true;
            } else if(typeof answerValue === "string"
                    && typeof checkValue === "string"
                    && answerValue.toUpperCase() === checkValue.toUpperCase()) {
                Logger.debug("AnswerCondition::checkAnswer() Condition met key: " + answerKey + " value: " + answerValue);
                return true;
            }
        }
        return false;
    }
}

module.exports = AnswerCondition;