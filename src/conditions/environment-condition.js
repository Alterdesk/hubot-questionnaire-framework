const Logger = require('./../logger.js');

class EnvironmentCondition {
    constructor(checkKey) {
        this.checkKey = checkKey;
    }

    setCheckValue(checkValue) {
        this.checkValue = checkValue;
    }

    check(answers) {
        if(!this.checkKey || this.checkKey.length === 0) {
            Logger.error("EnvironmentCondition::check() Invalid check key:", this.checkKey);
            return false;
        }
        var value = process.env[this.checkKey];
        if(value == null) {
            Logger.debug("EnvironmentCondition::check() No value for key:", this.checkKey);
            return false;
        }
        if(this.checkValue) {
            Logger.debug("EnvironmentCondition::check() Value for key matches:", this.checkKey, value);
            return this.checkValue === value;
        }
        Logger.debug("EnvironmentCondition::check() Has value for key:", this.checkKey);
        return true;
    }


}

module.exports = EnvironmentCondition;