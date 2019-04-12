const AnswerOrFixed = require('./../utils/answer-or-fixed.js');
const Condition = require('./condition.js');
const Logger = require('./../logger.js');

class AnswerCondition extends Condition {
    constructor() {
        super();
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
        var inverse = AnswerOrFixed.get(this.inverse, answers, false);
        for(let i in this.answerKeys) {
            var answerKey = this.answerKeys[i];
            var retrieveKey = answerKey;
            if(this.repeatIteration > -1) {
                retrieveKey = retrieveKey + "_" + this.repeatIteration;
                Logger.debug("AnswerCondition::check() Using repeat key: " + retrieveKey);
            }
            if(!answers.has(retrieveKey)) {
                Logger.debug("AnswerCondition::check() Key not available: " + retrieveKey);
                continue;
            }
            var answerValue = answers.get(retrieveKey);
            Logger.debug("AnswerCondition::check() Checking key: " + retrieveKey + " value: ", answerValue);
            if(typeof answerValue === "object") {
                if(answerValue.length === 0) {
                    if(this.checkAnswer(answerKey, null)) {
                        Logger.debug("AnswerCondition::check() Condition met: inverse: " + inverse + " condition:", this);
                        return !inverse;
                    }
                }
                for(let i in answerValue) {
                    if(this.checkAnswer(answerKey, answerValue[i])) {
                        Logger.debug("AnswerCondition::check() Condition met: inverse: " + inverse + " condition:", this);
                        return !inverse;
                    }
                }
            } else {
                if(this.checkAnswer(answerKey, answerValue)) {
                    Logger.debug("AnswerCondition::check() Condition met: inverse: " + inverse + " condition:", this);
                    return !inverse;
                }
            }
        }
        Logger.debug("AnswerCondition::check() Condition not met: inverse: " + inverse + " condition:", this);
        return inverse;
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

    hasKeys() {
        return this.answerKeys.length > 0;
    }
}

module.exports = AnswerCondition;