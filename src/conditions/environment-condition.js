const Condition = require('./condition.js');
const Logger = require('./../logger.js');

class EnvironmentCondition extends Condition {
    constructor() {
        super();
        this.checkKeys = [];
        this.checkValues = {};
        this.overrideEnvValues = {};
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

    setOverrideEnvValue(checkKey, envValue) {
        this.addKey(checkKey);
        this.overrideEnvValues[checkKey] = envValue;
    }

    check(flow) {
        var inverse = this.getAnswerValue(this.inverse, flow.answers, false);
        for(let checkKey of this.checkKeys) {
            var value = this.overrideEnvValues[checkKey];
            if(value == null) {
                value = process.env[checkKey];
            }
            if(value == null) {
                Logger.debug("EnvironmentCondition::check() No value for key:", checkKey);
                continue;
            }
            Logger.debug("EnvironmentCondition::check() Got value for key: ", checkKey, value);
            var values = this.checkValues[checkKey];
            if(!values || values.length === 0) {
                Logger.debug("EnvironmentCondition::check() Condition met: inverse: " + inverse + " key: " + checkKey);
                return !inverse;
            }
            for(let checkValue of values) {
                if(checkValue === value) {
                    Logger.debug("EnvironmentCondition::check() Condition met: inverse: " + inverse + " key: " + checkKey + " value: " + value);
                    return !inverse;
                } else if(typeof value === "string"
                        && typeof checkValue === "string"
                        && value.toUpperCase() === checkValue.toUpperCase()) {
                    Logger.debug("EnvironmentCondition::check() Condition met: inverse: " + inverse + " key: " + checkKey + " value: " + value);
                    return !inverse;
                }
            }
        }
        Logger.debug("EnvironmentCondition::check() Condition not met: inverse: " + inverse + " condition:", this);
        return inverse;
    }

    hasKeys() {
        return this.checkKeys.length > 0;
    }

}

module.exports = EnvironmentCondition;
