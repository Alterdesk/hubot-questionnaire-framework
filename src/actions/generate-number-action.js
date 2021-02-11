const Action = require('./action.js');
const Logger = require('./../logger.js');
const NumberTools = require('./../utils/number-tools.js');

class GenerateNumberAction extends Action {
    constructor(answerKey, min, max) {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
        this.answerKey = answerKey;
        this.min = min;
        this.max = max;
        this.numberConditions = [];
        this.failOperations = 0;
        this.maxFailOperations = 1000;
    }

    start(flowCallback) {
        let answers = this.flow.answers;
        let min = this.getAnswerValue(this.min, answers, 0);
        let max = this.getAnswerValue(this.max, answers, Number.MAX_SAFE_INTEGER);
        if(min >= max) {
            this.onError("GenerateNumberAction::start() Invalid range: min: " + min + " max: " + max);
            flowCallback();
            return;
        }
        Logger.debug("GenerateNumberAction::start() Using range: min: " + min + " max: " + max);

        this.generate(min, max);
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
        for(let condition of this.numberConditions) {
            if(!condition.check(this.flow)) {
                Logger.debug("GenerateNumberAction::checkNumberConditions() Condition not met: ", condition);
                return false;
            }
        }
        return true;
    }

    generate(min, max) {
        let num = NumberTools.generate(min, max);
        Logger.debug("GenerateNumberAction::start() Generated number: " + num);
        let answerKey = this.getAnswerKey();
        this.flow.answers.add(answerKey, num);
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

    addNumberConditions(conditions) {
        this.numberConditions = this.numberConditions.concat(conditions);
    }
}

module.exports = GenerateNumberAction;
