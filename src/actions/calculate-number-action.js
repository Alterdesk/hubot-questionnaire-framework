const Action = require('./action.js');
const Logger = require('./../logger.js');

class CalculateNumberAction extends Action {
    constructor(startValue, answerKey, operation) {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
        this.startValue = startValue;
        this.answerKey = answerKey;
        this.operation = operation;
        this.values = [];
    }

    start(flowCallback) {
        var answers = this.flow.answers;
        var result = this.getAnswerValue(this.startValue, answers);
        if(!result) {
            result = 0;
        }
        var operation = this.getAnswerValue(this.operation, answers);
        Logger.debug("CalculateNumberAction::start() Starting with value:", result);
        for(let v of this.values) {
            var value = this.getAnswerValue(v, answers);
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
        var answerKey = this.getAnswerKey();
        answers.add(answerKey, result);
        flowCallback();
    }

    addValue(value) {
        this.values.push(value);
    }

}

module.exports = CalculateNumberAction;
