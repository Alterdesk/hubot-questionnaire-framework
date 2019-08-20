const ChatTools = require('./../utils/chat-tools.js');
const Condition = require('./condition.js');
const Logger = require('./../logger.js');

class AnswerCondition extends Condition {
    constructor() {
        super();
        this.answerKeys = [];
        this.answerValues = {};
        this.answerRegex = {};
        this.answerRanges = {};
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

    setRange(answerKey, min, max) {
        this.addKey(answerKey);
        this.answerRanges[answerKey] = new AnswerRange(min, max);
    }

    check(flow) {
        var inverse = this.getAnswerValue(this.inverse, flow.answers, false);
        for(let i in this.answerKeys) {
            var answerKey = ChatTools.getAnswerKey(this.answerKeys[i], flow, this.forceRepeatIteration);
            if(!flow.answers.has(answerKey)) {
                Logger.debug("AnswerCondition::check() Key not available: " + answerKey);
                continue;
            }
            var answerValue = flow.answers.get(answerKey);
            Logger.debug("AnswerCondition::check() Checking key: " + answerKey + " value: ", answerValue);
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
        var range = this.answerRanges[answerKey];
        if((!values || values.length === 0) && !regex && !range) {
            Logger.debug("AnswerCondition::checkAnswer() Condition met: key: " + answerKey);
            return true;
        }
        if(regex) {
            if(typeof answerValue === "string"
                    && answerValue.match(regex)) {
                Logger.debug("AnswerCondition::checkAnswer() Condition met: key: " + answerKey + " value: " + answerValue + " regex: " + regex);
                return true;
            }
            Logger.debug("AnswerCondition::checkAnswer() Condition not met: key: " + answerKey + " value: " + answerValue + " regex: " + regex);
        }
        if(values && values.length > 0) {
            for(let i in values) {
                var checkValue = values[i];
                if(answerValue === checkValue) {
                    Logger.debug("AnswerCondition::checkAnswer() Condition met: key: " + answerKey + " value: " + answerValue);
                    return true;
                } else if(typeof answerValue === "string"
                        && typeof checkValue === "string"
                        && answerValue.toUpperCase() === checkValue.toUpperCase()) {
                    Logger.debug("AnswerCondition::checkAnswer() Condition met: key: " + answerKey + " value: " + answerValue);
                    return true;
                }
                Logger.debug("AnswerCondition::checkAnswer() Condition not met: key: " + answerKey + " value: " + answerValue + " check: " + checkValue);
            }
        }
        if(range) {
            if(typeof answerValue === "number"
                    && range.check(answerValue)) {
                Logger.debug("AnswerCondition::checkAnswer() Condition met: key: " + answerKey + " value: " + answerValue + " range: " + range);
                return true;
            }
            Logger.debug("AnswerCondition::checkAnswer() Condition not met: key: " + answerKey + " value: " + answerValue + " range: " + range);
        }
        return false;
    }

    hasKeys() {
        return this.answerKeys.length > 0;
    }
}

class AnswerRange {
    constructor(min, max) {
        this.min = min;
        this.max = max;
    }

    check(value) {
        return value >= this.min && value <= this.max;
    }
}

module.exports = AnswerCondition;