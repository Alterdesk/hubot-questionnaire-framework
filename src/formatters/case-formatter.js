const Formatter = require('./formatter.js');
const Logger = require('./../logger.js');

class CaseFormatter extends Formatter {

    constructor(toUppercase) {
        super();
        this.toUppercase = toUppercase;
    }

    execute(text, answers) {
        Logger.debug("CaseFormatter::execute() toUppercase:", this.toUppercase);
        if(!this.checkConditions(answers)) {
            Logger.debug("CaseFormatter::execute() Condition not met");
            return text;
        }
        if(this.toUppercase) {
            return text.toUpperCase();
        } else {
            return text.toLowerCase();
        }
    }

}

module.exports = CaseFormatter;