const AnswerOrFixed = require('./../utils/answer-or-fixed.js');
const Logger = require('./../logger.js');

class OrCondition extends Condition {
    constructor() {
        this.conditions = [];
    }

    check(answers) {
        var inverse = AnswerOrFixed.get(this.inverse, answers, false);
        for(let i in this.conditions) {
            var condition = this.conditions[i];
            if(condition.check(answers)) {
                Logger.debug("OrCondition::check() Condition met: inverse: " + inverse + " condition:", condition);
                return !inverse;
            }
        }
        Logger.debug("OrCondition::check() Conditions not met: inverse: " + inverse + " conditions:", this.conditions);
        return inverse;
    }

    setInverse(inverse) {
        this.inverse = inverse;
    }

    addCondition(condition) {
        this.conditions.push(condition);
    }

    hasConditions() {
        return this.conditions.length > 0;
    }

}

module.exports = OrCondition;