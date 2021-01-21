const Action = require('./action.js');
const DateTools = require('./../utils/date-tools.js');
const Logger = require('./../logger.js');

class ModifyDateAction extends Action {
    constructor(useDate, answerKey, operation, timeScale, timeValue) {
        super((flowCallback) => {
            this.start(flowCallback);
        }, 0);
        this.useDate = useDate;
        this.answerKey = answerKey;
        this.operation = operation;
        this.timeScale = timeScale;
        this.timeValue = timeValue;
        this.dateConditions = [];
        this.failOperations = 0;
        this.maxFailOperations = 1000;
    }

    start(flowCallback) {
        var answers = this.flow.answers;
        var date = this.getAnswerValue(this.useDate, answers);
        if(!date) {
            date = DateTools.utcDate();
        }
        var timeValue = this.getAnswerValue(this.timeValue, answers);
        if(timeValue < 0) {
            this.onError("ModifyDateAction::start() Invalid time value:", timeValue);
            flowCallback();
            return;
        }
        var timeScale = this.getAnswerValue(this.timeScale, answers);
        var useScale = DateTools.getTimeScale(timeScale);
        if(!useScale) {
            this.onError("ModifyDateAction::start() Invalid time scale:", timeScale);
            flowCallback();
            return;
        }
        var operation = this.getAnswerValue(this.operation, answers);
        Logger.debug("ModifyDateAction::start() Modifying date:", date);
        var moment = DateTools.getUTCMoment(date);
        if(!this.doOperation(operation, moment, useScale, timeValue)) {
            flowCallback();
            return;
        }

        if(this.dateConditions.length > 0) {
            var failTimeValue = this.getAnswerValue(this.failTimeValue, answers);
            if(failTimeValue < 1) {
                this.onError("ModifyDateAction::start() Invalid fail time value:", failTimeValue);
                flowCallback();
                return;
            }
            var failTimeScale = this.getAnswerValue(this.failTimeScale, answers);
            var useFailScale = DateTools.getTimeScale(failTimeScale);
            if(!useFailScale) {
                this.onError("ModifyDateAction::start() Invalid fail time scale:", failTimeScale);
                flowCallback();
                return;
            }
            var failOperation = this.getAnswerValue(this.failOperation, answers);
            while(!this.checkDateConditions()) {
                this.failOperations++;
                if(this.failOperations >= this.maxFailOperations) {
                    Logger.warn("ModifyDateAction::start() Maximum fail operations reached:", this.maxFailOperations);
                    if(this.failFlow) {
                        this.setSubFlow(this.failFlow);
                    }
                    flowCallback();
                    return;
                }
                if(!this.doOperation(failOperation, moment, failTimeScale, failTimeValue)) {
                    flowCallback();
                    return;
                }
            }
        }

        Logger.debug("ModifyDateAction::start() Modified date:", date);
        flowCallback();
    }

    doOperation(operation, moment, timeScale, timeValue) {
        Logger.debug("ModifyDateAction::doOperation() Operation: " + operation + " scale: " + timeScale + " value: " + timeValue);
        if(timeValue > 0) {
            if(operation === "ADD") {
                moment.add(timeValue, timeScale);
            } else if(operation === "SUBTRACT") {
                moment.subtract(timeValue, timeScale);
            } else {
                this.onError("ModifyDateAction::doOperation() Invalid operation: " + operation);
                return false;
            }
        }
        var date = moment.toDate();
        var answerKey = this.getAnswerKey();
        Logger.debug("ModifyDateAction::doOperation() Saving modified date:", answerKey, date);
        this.flow.answers.add(answerKey, date);
        return true;
    }

    checkDateConditions() {
        for(let i in this.dateConditions) {
            var condition = this.dateConditions[i];
            if(!condition.check(this.flow)) {
                Logger.debug("ModifyDateAction::checkDateConditions() Condition not met: ", condition);
                return false;
            }
        }
        return true;
    }

    setFailOperation(failOperation, failTimeScale, failTimeValue) {
        this.failOperation = failOperation;
        this.failTimeScale = failTimeScale;
        this.failTimeValue = failTimeValue;
    }

    setMaxFailOperations(maxFailOperations) {
        this.maxFailOperations = maxFailOperations;
    }

    setFailFlow(failFlow) {
        this.failFlow = failFlow;
    }

    addDateCondition(condition) {
        this.dateConditions.push(condition);
    }

    reset() {
        super.reset();
        this.failOperations = 0;
    }
}

module.exports = ModifyDateAction;
