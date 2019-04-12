const AnswerOrFixed = require('./../utils/answer-or-fixed.js');
const Condition = require('./condition.js');
const Logger = require('./../logger.js');

class AndCondition extends Condition {
    constructor() {
        super();
        this.conditions = [];
    }

    check(answers) {
        Logger.debug("AndCondition::check() Condition count:", this.conditions.length);
        var inverse = AnswerOrFixed.get(this.inverse, answers, false);
        for(let i in this.conditions) {
            var condition = this.conditions[i];
            if(this.repeatIteration > -1) {
                condition.setRepeatIteration(this.repeatIteration);
            }
            if(!condition.check(answers)) {
                Logger.debug("AndCondition::check() Condition not met: inverse: " + inverse + " condition:", condition);
                return inverse;
            }
        }
        Logger.debug("AndCondition::check() Conditions met: inverse: " + inverse + " conditions:", this.conditions);
        return !inverse;
    }

    addCondition(condition) {
        this.conditions.push(condition);
    }

    hasConditions() {
        return this.conditions.length > 0;
    }

}

module.exports = AndCondition;