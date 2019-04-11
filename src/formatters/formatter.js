const Logger = require('./../logger.js');

class Formatter {

    constructor() {
        this.conditions = [];
        this.repeatIteration = -1;
    }

    execute(text, answers) {

    }

    checkConditions(answers) {
        for(let i in this.conditions) {
            var condition = this.conditions[i];
            if(this.repeatIteration > -1) {
                condition.setRepeatIteration(this.repeatIteration);
            }
            if(!condition.check(answers)) {
                Logger.debug("Formatter::checkConditions() Condition not met: ", condition);
                return false;
            }
        }
        return true;
    }

    addCondition(condition) {
        this.conditions.push(condition);
    }

    setRepeatIteration(repeatIteration) {
        this.repeatIteration = repeatIteration;
    }

}

module.exports = Formatter;