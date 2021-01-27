const Condition = require('./condition.js');
const Logger = require('./../logger.js');

class AndCondition extends Condition {
    constructor() {
        super();
        this.conditions = [];
    }

    check(flow) {
        Logger.debug("AndCondition::check() Condition count:", this.conditions.length);
        let inverse = this.getAnswerValue(this.inverse, flow.answers, false);
        for(let condition of this.conditions) {
            if(!condition.check(flow)) {
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
