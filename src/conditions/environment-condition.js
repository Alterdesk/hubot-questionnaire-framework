const Logger = require('./../logger.js');

class EnvironmentCondition {
    constructor() {
        this.checkKeys = [];
        this.checkValues = {};
    }

    addKey(checkKey) {
        if(this.checkKeys.indexOf(checkKey) === -1) {
            this.checkKeys.push(checkKey);
        }
    }

    addValue(checkKey, checkValue) {
        this.addKey(checkKey);
        var values = this.checkValues[checkKey];
        if(!values) {
            values = [];
            this.checkValues[checkKey] = values;
        }
        if(values.indexOf(checkValue) === -1) {
            values.push(checkValue);
        }
    }

    check(answers) {
        for(let i in this.checkKeys) {
            var checkKey = this.checkKeys[i];
            var value = process.env[checkKey];
            if(value == null) {
                Logger.debug("EnvironmentCondition::check() No value for key:", checkKey);
                continue;
            }
            Logger.debug("EnvironmentCondition::check() Got value for key: ", checkKey, value);
            var values = this.checkValues[checkKey]
            if(!values || values.length === 0) {
                Logger.debug("EnvironmentCondition::check() Condition met key: " + checkKey);
                return true;
            }
            for(let i in values) {
                var checkValue = values[i];
                if(checkValue === value) {
                    Logger.debug("EnvironmentCondition::check() Condition met key: " + checkKey + " value: " + value);
                    return true;
                } else if(typeof value === "string"
                        && typeof checkValue === "string"
                        && value.toUpperCase() === checkValue.toUpperCase()) {
                    Logger.debug("EnvironmentCondition::check() Condition met key: " + checkKey + " value: " + value);
                    return true;
                }
            }
        }
        Logger.debug("EnvironmentCondition::check() Condition not met:", this);
        return false;
    }

    hasKeys() {
        return this.checkKeys.length > 0;
    }

}

module.exports = EnvironmentCondition;