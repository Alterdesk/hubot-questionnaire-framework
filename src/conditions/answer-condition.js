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
        let values = this.answerValues[answerKey];
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
        let answers = flow.answers;
        let inverse = this.getAnswerValue(this.inverse, answers, false);
        for(let checkKey of this.answerKeys) {
            let answerKey = ChatTools.getAnswerKey(checkKey, flow, this.forceRepeatIteration);
            if(!answers.has(answerKey)) {
                Logger.debug("AnswerCondition::check() Key not available: " + answerKey);
                continue;
            }
            let answerValue = answers.get(answerKey);
            let type = typeof answerValue;
            let className = "";
            if(answerValue && answerValue.constructor) {
                className = answerValue.constructor.name;
            }
            Logger.debug("AnswerCondition::check() Checking key: " + answerKey + " type: " + type + " class: " + className + " value: ", answerValue);
            if(type === "object" && className !== "Date") {
                if(answerValue.length === 0) {
                    if(this.checkAnswer(checkKey, answerKey, null, answers)) {
                        Logger.debug("AnswerCondition::check() Condition met: inverse: " + inverse + " condition:", this);
                        return !inverse;
                    }
                }
                for(let value of answerValue) {
                    if(this.checkAnswer(checkKey, answerKey, value, answers)) {
                        Logger.debug("AnswerCondition::check() Condition met: inverse: " + inverse + " condition:", this);
                        return !inverse;
                    }
                }
            } else {
                if(this.checkAnswer(checkKey, answerKey, answerValue, answers)) {
                    Logger.debug("AnswerCondition::check() Condition met: inverse: " + inverse + " condition:", this);
                    return !inverse;
                }
            }
        }
        Logger.debug("AnswerCondition::check() Condition not met: inverse: " + inverse + " condition:", this);
        return inverse;
    }

    checkAnswer(checkKey, answerKey, answerValue, answers) {
        let regex = this.answerRegex[checkKey];
        let values = this.answerValues[checkKey];
        let range = this.answerRanges[checkKey];
        if((!values || values.length === 0) && !regex && !range) {
            Logger.debug("AnswerCondition::checkAnswer() No restrictions and answer given: key: " + answerKey);
            return true;
        }
        if(regex) {
            if(typeof answerValue === "string"
                    && answerValue.match(regex)) {
                Logger.debug("AnswerCondition::checkAnswer() Matched by regex: key: " + answerKey + " value: " + answerValue + " regex: " + regex);
                return true;
            }
            Logger.debug("AnswerCondition::checkAnswer() Not matched by regex: key: " + answerKey + " value: " + answerValue + " regex: " + regex);
        }
        if(values && values.length > 0) {
            for(let value of values) {
                let checkValue = this.getAnswerValue(value, answers);
                if(answerValue === checkValue) {
                    Logger.debug("AnswerCondition::checkAnswer() Equals value: key: " + answerKey + " value: " + answerValue);
                    return true;
                } else if(typeof answerValue === "string"
                        && typeof checkValue === "string"
                        && answerValue.toUpperCase() === checkValue.toUpperCase()) {
                    Logger.debug("AnswerCondition::checkAnswer() Equals value: key: " + answerKey + " value: " + answerValue);
                    return true;
                }
                Logger.debug("AnswerCondition::checkAnswer() Does not equals value: key: " + answerKey + " value: " + answerValue + " check: " + checkValue);
            }
        }
        if(range) {
            if(typeof answerValue === "number"
                    && range.check(answerValue)) {
                Logger.debug("AnswerCondition::checkAnswer() In range: key: " + answerKey + " value: " + answerValue + " range: " + range);
                return true;
            }
            Logger.debug("AnswerCondition::checkAnswer() Not in range: key: " + answerKey + " value: " + answerValue + " range: " + range);
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
