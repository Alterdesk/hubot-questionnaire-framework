const Logger = require('./../logger.js');

class Formatter {

    constructor() {
        this.conditions = [];
    }

    execute(text, answers) {

    }

    checkConditions(answers) {
        for(let i in this.conditions) {
            var condition = this.conditions[i];
            if(!condition.check(answers)) {
                Logger.debug("Formatter::execute() Condition not met: ", condition);
                return false;
            }
        }
        return true;
    }

    addCondition(condition) {
        this.conditions.push(condition);
    }

}

module.exports = Formatter;