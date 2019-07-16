const Action = require('./action.js');
const AnswerOrFixed = require('./../utils/answer-or-fixed.js');
const Answers = require('./../answers.js');
const Logger = require('./../logger.js');

class GenerateNumberAction extends Action {
    constructor(answerKey, min, max) {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, 0);
        this.answerKey = answerKey;
        this.min = min;
        this.max = max;
        this.numberConditions = [];
        this.failOperations = 0;
        this.maxFailOperations = 1000;
    }

    start(response, answers, flowCallback) {
        this.answers = answers;
        var min = AnswerOrFixed.get(this.min, answers, 0)
        var max = AnswerOrFixed.get(this.max, answers, Number.MAX_SAFE_INTEGER);
        if(min >= max) {
            Logger.error("GenerateNumberAction::start() Invalid range: min: " + min + " max: " + max);
            flowCallback();
            return;
        }
        Logger.debug("GenerateNumberAction::start() Using range: min: " + min + " max: " + max);

        var num = this.generate(min, max);
        while(!this.checkNumberConditions()) {
            this.failOperations++;
            if(this.failOperations < this.maxFailOperations) {
                if(this.failFlow) {
                    this.setSubFlow(this.failFlow);
                }
                flowCallback();
                return;
            }
        }

        flowCallback();
    }

    checkNumberConditions() {
        for(let i in this.numberConditions) {
            var condition = this.numberConditions[i];
            if(this.repeatIteration > -1) {
                condition.setRepeatIteration(this.repeatIteration);
            }
            if(!condition.check(answers)) {
                Logger.debug("GenerateNumberAction::checkNumberConditions() Condition not met: ", condition);
                return false;
            }
        }
        return true;
    }

    generate(min, max) {
        var num = Math.round((Math.random() * (max - min)) + min);
        Logger.debug("GenerateNumberAction::start() Generated number: " + num);
        this.answers.add(this.answerKey, num);
    }

    setMaxFailOperations(maxFailOperations) {
        this.maxFailOperations = maxFailOperations;
    }

    setFailFlow(failFlow) {
        this.failFlow = failFlow;
    }

    addNumberCondition(condition) {
        this.numberConditions.push(condition);
    }
}

module.exports = GenerateNumberAction;