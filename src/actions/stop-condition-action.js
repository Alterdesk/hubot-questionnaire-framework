const Action = require('./action.js');
const Answers = require('./../answers.js');
const Logger = require('./../logger.js');

class StopConditionAction extends Action {
    constructor(sendMessage, waitMs) {
        super((flowCallback) => {
            this.start(flowCallback);
        }, waitMs);
        this.sendMessage = sendMessage;
        this.conditions = [];
    }

    start(flowCallback) {
        if(this.conditions.length === 0) {
            Logger.debug("StopConditionAction::start() No conditions are set, stopping flow");
        } else {
            for(let condition of this.conditions) {
                if(!condition.check(this.flow)) {
                    Logger.debug("StopConditionAction::start() Condition not met: ", condition);
                    flowCallback();
                    return;
                }
            }
            Logger.debug("StopConditionAction::start() All conditions were met, stopping flow");
        }

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

    addCondition(condition) {
        this.conditions.push(condition);
    }

    setAnswerOnStop(answerKey, answerValue) {
        if(!this.setAnswers) {
            this.setAnswers = new Answers();
        }
        this.setAnswers.add(answerKey, answerValue);
    }
}

module.exports = StopConditionAction;
