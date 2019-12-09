const Formatter = require('./formatter.js');
const Logger = require('./../logger.js');
const StringTools = require('./../utils/string-tools.js');

class TruncateFormatter extends Formatter {

    constructor(truncateAt, maxLength) {
        super();
        this.truncateAt = truncateAt;
        this.maxLength = maxLength;
    }

    execute(text, flow) {
        Logger.debug("TruncateFormatter::execute() maxLength: " + this.maxLength + " truncateAt:", this.truncateAt);
        if(!this.checkConditions(flow)) {
            Logger.debug("TruncateFormatter::execute() Condition not met");
            return text;
        }
        if(!text || text.length <= this.maxLength) {
            return text;
        }
        if(this.truncateAt === "END") {
            return StringTools.truncateEnd(text, this.maxLength);
        } else {
            return StringTools.truncateStart(text, this.maxLength);
        }
    }

}

module.exports = TruncateFormatter;