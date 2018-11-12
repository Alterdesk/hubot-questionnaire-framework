const Action = require('./action.js');
const Answers = require('./../answers.js');
const Logger = require('./../logger.js');

class StopConditionAction extends Action {
    constructor(sendMessage, waitMs) {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, waitMs);
        this.sendMessage = sendMessage;
        this.conditions = [];
    }

    start(response, answers, flowCallback) {
        if(this.conditions.length === 0) {
            Logger.error("StopConditionAction::start() No conditions are set");
            flowCallback();
            return;
        }

        for(let i in this.conditions) {
            var condition = this.conditions[i];
            if(!condition.check(answers)) {
                Logger.debug("StopConditionAction::start() Condition not met: ", condition);
                flowCallback();
                return;
            }
        }

        Logger.debug("StopConditionAction::start() All conditions were met, stopping flow");

        if(this.setAnswers) {
            var keys = this.setAnswers.keys();
            for(let i in keys) {
                var key = keys[i];
                var value = this.setAnswers.get(key);
                this.flow.answers.add(key, value);
            }
        }

        this.flow.stop(this.sendMessage);
        flowCallback();
    }

    addAnswerCondition(answerKey, answerValue) {
        this.conditions.push(new AnswerCondition(answerKey, answerValue));
    }

    setAnswerOnStop(answerKey, answerValue) {
        if(!this.setAnswers) {
            this.setAnswers = new Answers();
        }
        this.setAnswers.add(answerKey, answerValue);
    }
}

class AnswerCondition {
    constructor(answerKey, answerValue) {
        this.answerKey = answerKey;
        this.answerValue = answerValue;
    }

    check(answers) {
        var value = answers.get(this.answerKey);
        return value === this.answerValue;
    }
}

module.exports = StopConditionAction;