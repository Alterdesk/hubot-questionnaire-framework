const Action = require('./action.js');
const AnswerOrFixed = require('./../utils/answer-or-fixed.js');
const DateTools = require('./../utils/date-tools.js');
const Logger = require('./../logger.js');

class CalculateNumberAction extends Action {
    constructor(startValue, answerKey, operation) {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, 0);
        this.startValue = startValue;
        this.answerKey = answerKey;
        this.operation = operation;
        this.values = [];
    }

    start(response, answers, flowCallback) {
        this.answers = answers;
        var result = AnswerOrFixed.get(this.startValue, answers);
        if(!result) {
            result = 0;
        }
        var timeValue = AnswerOrFixed.get(this.timeValue, answers);
        if(timeValue < 0) {
            Logger.error("CalculateNumberAction::start() Invalid time value:", timeValue);
            flowCallback();
            return;
        }
        var operation = AnswerOrFixed.get(this.operation, answers);
        Logger.debug("CalculateNumberAction::start() Starting with value:", result);
        for(let index in this.values) {
            var value = AnswerOrFixed.get(this.values[index], answers);
            if(typeof value !== "number") {
                Logger.debug("CalculateNumberAction::start() Invalid value: " + value);
                continue;
            }
            if(operation === "ADD") {
                result += value;
            } else if(operation === "SUBTRACT") {
                result -= value;
            } else {
                Logger.debug("CalculateNumberAction::start() Invalid operation: " + operation);
                flowCallback();
                return;
            }
        }

        Logger.debug("CalculateNumberAction::start() Result:", result);
        flowCallback();
    }

    addValue(value) {
        this.values.push(value);
    }

}

module.exports = CalculateNumberAction;