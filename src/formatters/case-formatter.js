const Formatter = require('./formatter.js');
const Logger = require('./../logger.js');

class CaseFormatter extends Formatter {

    constructor(toUppercase) {
        super();
        this.toUppercase = toUppercase;
    }

    execute(text, flow) {
        if(!this.checkConditions(flow)) {
            Logger.debug("CaseFormatter::execute() Condition not met: toUppercase:", this.toUppercase);
            return text;
        }
        Logger.debug("CaseFormatter::execute() toUppercase:", this.toUppercase);
        if(this.toUppercase) {
            return text.toUpperCase();
        } else {
            return text.toLowerCase();
        }
    }

}

module.exports = CaseFormatter;