const Action = require('./action.js');
const AnswerOrFixed = require('./../utils/answer-or-fixed.js');
const DateTools = require('./../utils/date-tools.js');
const Logger = require('./../logger.js');

class ModifyDateAction extends Action {
    constructor(useDate, answerKey, operation, timeScale, timeValue) {
        super((response, answers, flowCallback) => {
            this.start(response, answers, flowCallback);
        }, 0);
        this.useDate = useDate;
        this.answerKey = answerKey;
        this.operation = operation;
        this.timeScale = timeScale;
        this.timeValue = timeValue;
        this.dateConditions = [];
    }

    start(response, answers, flowCallback) {
        this.answers = answers;
        var date = AnswerOrFixed.get(this.useDate, answers);
        if(!date) {
            date = new Date();
        }
        var timeValue = AnswerOrFixed.get(this.timeValue, answers);
        if(timeValue < 0) {
            Logger.error("ModifyDateAction::start() Invalid time value:", timeValue);
            flowCallback();
            return;
        }
        var timeScale = AnswerOrFixed.get(this.timeScale, answers);
        var useScale = DateTools.getTimeScale(timeScale);
        if(!useScale) {
            Logger.error("ModifyDateAction::start() Invalid time scale:", timeScale);
            flowCallback();
            return;
        }
        var operation = AnswerOrFixed.get(this.operation, answers);
        Logger.debug("ModifyDateAction::start() Modifying date:", date);
        var moment = DateTools.getMoment(date);
        if(!this.doOperation(operation, moment, useScale, timeValue)) {
            flowCallback();
            return;
        }

        if(this.dateConditions.length > 0) {
            var failTimeValue = AnswerOrFixed.get(this.failTimeValue, answers);
            if(failTimeValue < 1) {
                Logger.error("ModifyDateAction::start() Invalid fail time value:", failTimeValue);
                flowCallback();
                return;
            }
            var failTimeScale = AnswerOrFixed.get(this.failTimeScale, answers);
            var useFailScale = DateTools.getTimeScale(failTimeScale);
            if(!useFailScale) {
                Logger.error("ModifyDateAction::start() Invalid fail time scale:", failTimeScale);
                flowCallback();
                return;
            }
            var failOperation = AnswerOrFixed.get(this.failOperation, answers);
            while(!this.checkDateConditions()) {
                if(!this.doOperation(failOperation, moment, failTimeScale, failTimeValue)) {
                    flowCallback();
                    return;
                }
            }
        }

        flowCallback();
    }

    doOperation(operation, moment, timeScale, timeValue) {
        Logger.debug("ModifyDateAction::doOperation() operation: " + operation + " scale: " + timeScale + " value: " + timeValue);
        if(timeValue > 0) {
            if(operation === "ADD") {
                moment.add(timeValue, timeScale);
            } else if(operation === "SUBTRACT") {
                moment.subtract(timeValue, timeScale);
            } else {
                return false;
            }
        }
        var date = moment.toDate();
        Logger.debug("ModifyDateAction::doOperation() Saving modified date:", this.answerKey, date);
        this.answers.add(this.answerKey, date);
        return true;
    }

    checkDateConditions() {
        for(let i in this.dateConditions) {
            var condition = this.dateConditions[i];
            if(!condition.check(this.answers)) {
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

    addDateCondition(condition) {
        this.dateConditions.push(condition);
    }
}

module.exports = ModifyDateAction;