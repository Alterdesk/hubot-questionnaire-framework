const Condition = require('./condition.js');
const Logger = require('./../logger.js');

class OrCondition extends Condition {
    constructor() {
        super();
        this.conditions = [];
    }

    check(flow) {
        Logger.debug("OrCondition::check() Condition count:", this.conditions.length);
        var inverse = this.getAnswerValue(this.inverse, flow.answers, false);
        for(let condition of this.conditions) {
            if(condition.check(flow)) {
                Logger.debug("OrCondition::check() Condition met: inverse: " + inverse + " condition:", condition);
                return !inverse;
            }
        }
        Logger.debug("OrCondition::check() Conditions not met: inverse: " + inverse + " conditions:", this.conditions);
        return inverse;
    }

    addCondition(condition) {
        this.conditions.push(condition);
    }

    hasConditions() {
        return this.conditions.length > 0;
    }

}

module.exports = OrCondition;
